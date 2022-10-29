import { Trie } from '@ethereumjs/trie'
import {
  Account,
  Address,
  accountBodyToRLP,
  bigIntToBuffer,
  bufferToBigInt,
  setLengthLeft,
  bufferToHex,
  accountBodyFromSlim,
  KECCAK256_NULL,
  KECCAK256_RLP,
} from '@ethereumjs/util'

import { LevelDB } from '../../execution/level'
import { short } from '../../util'

import type { Peer } from '../../net/peer'
import type { AccountData } from '../../net/protocol/snapprotocol'
import type { Job } from './types'
import { Fetcher, FetcherOptions } from './fetcher'
import { StorageFetcher } from './storagefetcher'
import { DefaultStateManager } from '@ethereumjs/statemanager'

type AccountDataResponse = AccountData[] & { completed?: boolean }

/**
 * Implements an snap1 based account fetcher
 * @memberof module:sync/fetcher
 */
export interface AccountFetcherOptions extends FetcherOptions {
  /** Root hash of the account trie to serve */
  root: Buffer

  /** The origin to start account fetcher from */
  first: bigint

  // accountTrie: Trie
  stateManager: DefaultStateManager

  /** Range to eventually fetch */
  count?: bigint

  /** Destroy fetcher once all tasks are done */
  destroyWhenDone?: boolean
}

// root comes from block?
export type JobTask = {
  /** The origin to start account fetcher from */
  first: bigint
  /** Range to eventually fetch */
  count: bigint
}

export class AccountFetcher extends Fetcher<JobTask, AccountData[], AccountData> {
  /**
   * The stateRoot for the fetcher which sorts of pin it to a snapshot.
   * This might eventually be removed as the snapshots are moving and not static
   */
  root: Buffer

  /** The origin to start account fetcher from (including), by default starts from 0 (0x0000...) */
  first: bigint

  /** The range to eventually, by default should be set at BigInt(2) ** BigInt(256) + BigInt(1) - first */
  count: bigint

  // accountTrie: CheckpointTrie

  stateManager: DefaultStateManager

  /**
   * Create new block fetcher
   */
  constructor(options: AccountFetcherOptions) {
    super(options)

    // this.accountTrie = options.accountTrie
    this.stateManager = options.stateManager

    this.root = options.root
    this.first = options.first
    this.count = options.count ?? BigInt(2) ** BigInt(256) - this.first

    const fullJob = { task: { first: this.first, count: this.count } } as Job<
      JobTask,
      AccountData[],
      AccountData
    >
    const origin = this.getOrigin(fullJob)
    const limit = this.getLimit(fullJob)

    this.debug(
      `Account fetcher instantiated root=${short(this.root)} origin=${short(origin)} limit=${short(
        limit
      )} destroyWhenDone=${this.destroyWhenDone}`
    )
  }

  private async verifyRangeProof(
    stateRoot: Buffer,
    origin: Buffer,
    { accounts, proof }: { accounts: AccountData[]; proof: Buffer[] }
  ): Promise<boolean> {
    this.debug(
      `verifyRangeProof accounts:${accounts.length} first=${short(accounts[0].hash)} last=${short(
        accounts[accounts.length - 1].hash
      )}`
    )

    for (let i = 0; i < accounts.length - 1; i++) {
      // ensure the range is monotonically increasing
      if (accounts[i].hash.compare(accounts[i + 1].hash) === 1) {
        throw Error(
          `Account hashes not monotonically increasing: ${i} ${accounts[i].hash} vs ${i + 1} ${
            accounts[i + 1].hash
          }`
        )
      }
    }

    const trie = new Trie({ db: new LevelDB() })
    const keys = accounts.map((acc: any) => acc.hash)
    const values = accounts.map((acc: any) => accountBodyToRLP(acc.body))
    // convert the request to the right values
    return await trie.verifyRangeProof(
      stateRoot,
      origin,
      keys[keys.length - 1],
      keys,
      values,
      <any>proof
    )
  }

  private getOrigin(job: Job<JobTask, AccountData[], AccountData>): Buffer {
    const { task, partialResult } = job
    const { first } = task
    // Snap protocol will automatically pad it with 32 bytes left, so we don't need to worry
    const origin = partialResult
      ? bigIntToBuffer(bufferToBigInt(partialResult[partialResult.length - 1].hash) + BigInt(1))
      : bigIntToBuffer(first)
    return setLengthLeft(origin, 32)
  }

  private getLimit(job: Job<JobTask, AccountData[], AccountData>): Buffer {
    const { task } = job
    const { first, count } = task
    const limit = bigIntToBuffer(first + BigInt(count) - BigInt(1))
    return setLengthLeft(limit, 32)
  }

  /**
   * Request results from peer for the given job.
   * Resolves with the raw result
   * If `undefined` is returned, re-queue the job.
   * @param job
   * @param peer
   */
  async request(
    job: Job<JobTask, AccountData[], AccountData>
  ): Promise<AccountDataResponse | undefined> {
    const { peer } = job
    const origin = this.getOrigin(job)
    const limit = this.getLimit(job)

    const rangeResult = await peer!.snap!.getAccountRange({
      root: this.root,
      origin,
      limit,
      bytes: BigInt(this.config.maxRangeBytes),
    })

    const peerInfo = `id=${peer?.id.slice(0, 8)} address=${peer?.address}`

    // eslint-disable-next-line eqeqeq
    if (rangeResult === undefined) {
      return undefined
    } else {
      // validate the proof
      try {
        // verifyRangeProof will also verify validate there are no missed states between origin and
        // response data
        const isMissingRightRange = await this.verifyRangeProof(this.root, origin, rangeResult)

        // Check if there is any pending data to be synced to the right
        let completed: boolean
        if (isMissingRightRange) {
          this.debug(
            `Peer ${peerInfo} returned missing right range account=${rangeResult.accounts[
              rangeResult.accounts.length - 1
            ].hash.toString('hex')} limit=${limit.toString('hex')}`
          )
          completed = false
        } else {
          completed = true
        }

        // queue accounts that have a storage component to them for storage fetching
        // TODO we need to check convertSlimBody setting here and convert accordingly
        // const emptyUint8Arr = new Uint8Array(0)
        // for (const accountData of rangeResult.accounts) {
        //   const account = Account.fromAccountData(accountData.body as any)
        //   this.debug(`dbg0: ${account.storageRoot.compare(KECCAK256_RLP)}`)
        //   if (account.storageRoot.compare(KECCAK256_RLP) !== 0) {
        //     // start storage fetcher
        //     this.storageFetchers.unshift(
        //       new StorageFetcher({
        //         config: this.config,
        //         pool: this.pool,
        //         root: this.root,
        //         accounts: [accountData.hash],
        //         first: BigInt(1),
        //       })
        //     )
        //   }
        // }

        return Object.assign([], rangeResult.accounts, { completed })
      } catch (err) {
        throw Error(`InvalidAccountRange: ${err}`)
      }
    }
  }

  /**
   * Process the reply for the given job.
   * If the reply contains unexpected data, return `undefined`,
   * this re-queues the job.
   * @param job fetch job
   * @param result result data
   */
  process(
    job: Job<JobTask, AccountData[], AccountData>,
    result: AccountDataResponse
  ): AccountData[] | undefined {
    // TODO this seems like a good spot to enqueue tasks for storage and byte code fetching
    const fullResult = (job.partialResult ?? []).concat(result)
    job.partialResult = undefined
    if (result.completed === true) {
      return fullResult
    } else {
      // Save partial result to re-request missing items.
      job.partialResult = fullResult
    }
  }

  /**
   * Store fetch result. Resolves once store operation is complete.
   * @param result fetch result
   */
  async store(result: AccountData[]): Promise<void> {
    this.debug(`Stored ${result.length} accounts in account trie`)

    try {
      // store in statemanager passed in from calling class
      for (const accountData of result) {
        const { hash, body } = accountData
        // this.accountTrie.put(hash, accountBodyToRLP(body))
        // const address = new Address(hash)  // fails to instantiate - shouldn't be using stateManager, but could potentially use a modified version of it for the snap sync spec
        // const account = Account.fromRlpSerializedAccount(accountBodyToRLP(body) as Buffer)
        // this.stateManager.putAccount(address, account)
      }

      // when all of the accounts have been fetched, check if requested root matches stateRoot
      if (this.count <= BigInt(0)) {
        const stateRoot: Buffer = await this.stateManager.getStateRoot()
        if (stateRoot.compare(this.root) === 0) {
          this.debug(`Account fetch is finished and successful`)
        } else {
          this.debug(`Account fetch is finished and unsuccessful`)
        }
        this.debug(
          `stateRoot current is ${bufferToHex(stateRoot)} - expected is ${bufferToHex(this.root)}`
        )
        process.exit()
      }
    } catch (err) {
      throw Error(`Failed in fetcher store(): ${err}`)
    }
  }

  /**
   * Generate list of tasks to fetch. Modifies `first` and `count` to indicate
   * remaining items apart from the tasks it pushes in the queue
   *
   * Divides the full 256-bit range of hashes into @maxRangeConcurrency ranges
   * and turnes each range into a task for the fetcher
   */

  tasks(first = this.first, count = this.count, maxTasks = this.config.maxFetcherJobs): JobTask[] {
    const max = this.config.maxAccountRange
    const tasks: JobTask[] = []
    let debugStr = `origin=${short(setLengthLeft(bigIntToBuffer(first), 32))}`
    let pushedCount = BigInt(0)
    const startedWith = first

    while (count >= BigInt(max) && tasks.length < maxTasks) {
      tasks.push({ first, count: max })
      first += BigInt(max)
      count -= BigInt(max)
      pushedCount += BigInt(max)
    }
    if (count > BigInt(0) && tasks.length < maxTasks) {
      tasks.push({ first, count })
      first += BigInt(count)
      pushedCount += count
      count = BigInt(0)
    }

    // If we started with where this.first was, i.e. there are no gaps and hence
    // we can move this.first to where its now, and reduce count by pushedCount
    if (startedWith === this.first) {
      this.first = first
      this.count = this.count - pushedCount
    }

    debugStr += ` limit=${short(
      setLengthLeft(bigIntToBuffer(startedWith + pushedCount - BigInt(1)), 32)
    )}`
    this.debug(`Created new tasks num=${tasks.length} ${debugStr}`)
    return tasks
  }

  nextTasks(): void {
    if (this.in.length === 0 && this.count > BigInt(0)) {
      const fullJob = { task: { first: this.first, count: this.count } } as Job<
        JobTask,
        AccountData[],
        AccountData
      >
      const origin = this.getOrigin(fullJob)
      const limit = this.getLimit(fullJob)

      this.debug(`Fetcher pending with origin=${short(origin)} limit=${short(limit)}`)
      const tasks = this.tasks()
      for (const task of tasks) {
        this.enqueueTask(task)
      }
    }
  }

  /**
   * Clears all outstanding tasks from the fetcher
   */
  clear() {
    return
  }

  /**
   * Returns an idle peer that can process a next job.
   */
  peer(): Peer | undefined {
    return this.pool.idle((peer) => 'snap' in peer)
  }

  processStoreError(
    error: Error,
    _task: JobTask
  ): { destroyFetcher: boolean; banPeer: boolean; stepBack: bigint } {
    const stepBack = BigInt(0)
    const destroyFetcher =
      !(error.message as string).includes(`InvalidRangeProof`) &&
      !(error.message as string).includes(`InvalidAccountRange`)
    const banPeer = true
    return { destroyFetcher, banPeer, stepBack }
  }

  /**
   * Job log format helper.
   * @param job
   * @param withIndex pass true to additionally output job.index
   */
  jobStr(job: Job<JobTask, AccountData[], AccountData>, withIndex = false) {
    let str = ''
    if (withIndex) {
      str += `index=${job.index} `
    }

    const origin = this.getOrigin(job)
    const limit = this.getLimit(job)

    let partialResult
    if (job.partialResult) {
      partialResult = ` partialResults=${job.partialResult.length}`
    } else {
      partialResult = ''
    }

    str += `origin=${short(origin)} limit=${short(limit)}${partialResult}`
    return str
  }
}
