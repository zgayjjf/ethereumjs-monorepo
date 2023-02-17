import { Block, BlockHeader, valuesArrayToHeaderData } from '@ethereumjs/block'
import { RLP } from '@ethereumjs/rlp'
import { KECCAK256_RLP, KECCAK256_RLP_ARRAY, arrToBufArr, bufferToBigInt } from '@ethereumjs/util'

import { Cache } from './cache'
import { DBOp, DBTarget } from './operation'

import type { DBOpData, DatabaseKey } from './operation'
import type { BlockBodyBuffer, BlockBuffer, BlockOptions } from '@ethereumjs/block'
import type { Common } from '@ethereumjs/common'
import type { AbstractLevel } from 'abstract-level'

class NotFoundError extends Error {
  public code: string = 'LEVEL_NOT_FOUND'

  constructor(blockNumber: bigint) {
    super(`Key ${blockNumber.toString()} was not found`)

    // `Error.captureStackTrace` is not defined in some browser contexts
    if (typeof Error.captureStackTrace !== 'undefined') {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

/**
 * @hidden
 */
export interface GetOpts {
  keyEncoding?: string
  valueEncoding?: string
  cache?: string
}

export type CacheMap = { [key: string]: Cache<Buffer> }

/**
 * Abstraction over a DB to facilitate storing/fetching blockchain-related
 * data, such as blocks and headers, indices, and the head block.
 * @hidden
 */
export class DBManager {
  private _cache: CacheMap
  private _common: Common
  private _db: AbstractLevel<string | Buffer | Uint8Array, string | Buffer, string | Buffer>

  constructor(
    db: AbstractLevel<string | Buffer | Uint8Array, string | Buffer, string | Buffer>,
    common: Common
  ) {
    this._db = db
    this._common = common
    this._cache = {
      td: new Cache({ max: 1024 }),
      header: new Cache({ max: 512 }),
      body: new Cache({ max: 256 }),
      numberToHash: new Cache({ max: 2048 }),
      hashToNumber: new Cache({ max: 2048 }),
    }
  }

  /**
   * Fetches iterator heads from the db.
   */
  async getHeads(): Promise<{ [key: string]: Buffer }> {
    const heads = await this.get(DBTarget.Heads)
    for (const key of Object.keys(heads)) {
      heads[key] = Buffer.from(heads[key])
    }
    return heads
  }

  /**
   * Fetches header of the head block.
   */
  async getHeadHeader(): Promise<Buffer> {
    return this.get(DBTarget.HeadHeader)
  }

  /**
   * Fetches head block.
   */
  async getHeadBlock(): Promise<Buffer> {
    return this.get(DBTarget.HeadBlock)
  }

  /**
   * Fetches a block (header and body) given a block id,
   * which can be either its hash or its number.
   */
  async getBlock(blockId: Buffer | bigint | number): Promise<Block> {
    if (typeof blockId === 'number' && Number.isInteger(blockId)) {
      blockId = BigInt(blockId)
    }

    let number
    let hash
    if (Buffer.isBuffer(blockId)) {
      hash = blockId
      number = await this.hashToNumber(blockId)
    } else if (typeof blockId === 'bigint') {
      number = blockId
      hash = await this.numberToHash(blockId)
    } else {
      throw new Error('Unknown blockId type')
    }

    const header = await this.getHeader(hash, number)
    const body = await this.getBodyWithEmptyHandled(header, hash, number)

    const blockData = [header.raw(), ...body] as BlockBuffer
    const opts: BlockOptions = { common: this._common }
    if (number === BigInt(0)) {
      opts.hardforkByTTD = await this.getTotalDifficulty(hash, BigInt(0))
    } else {
      opts.hardforkByTTD = await this.getTotalDifficulty(header.parentHash, number - BigInt(1))
    }
    return Block.fromValuesArray(blockData, opts)
  }

  /**
   * Fetches body of a block with construction from nil bodies handled
   */
  private async getBodyWithEmptyHandled(
    header: BlockHeader,
    blockHash: Buffer,
    blockNumber: bigint
  ): Promise<BlockBodyBuffer> {
    let body: BlockBodyBuffer
    try {
      body = await this.getBody(blockHash, blockNumber)
    } catch (error: any) {
      if (error.code !== 'LEVEL_NOT_FOUND') {
        throw error
      }

      // Do extra validations on the header since we are assuming empty transactions and uncles
      if (
        !header.transactionsTrie.equals(KECCAK256_RLP) ||
        !header.uncleHash.equals(KECCAK256_RLP_ARRAY)
      ) {
        throw error
      }
      body = [[], []]
      // If this block had empty withdrawals push an empty array in body
      if (header.withdrawalsRoot !== undefined) {
        // Do extra validations for withdrawal before assuming empty withdrawals
        if (!header.withdrawalsRoot.equals(KECCAK256_RLP)) {
          throw error
        }
        body.push([])
      }
    }
    return body
  }

  /**
   * Fetches body of a block given its hash and number.
   */
  async getBody(blockHash: Buffer, blockNumber: bigint): Promise<BlockBodyBuffer> {
    const body = await this.get(DBTarget.Body, { blockHash, blockNumber })
    return arrToBufArr(RLP.decode(Uint8Array.from(body))) as BlockBodyBuffer
  }

  /**
   * Fetches header of a block given its hash and number.
   */
  async getHeader(blockHash: Buffer, blockNumber: bigint) {
    const encodedHeader = await this.get(DBTarget.Header, { blockHash, blockNumber })
    const headerValues = arrToBufArr(RLP.decode(Uint8Array.from(encodedHeader)))

    const opts: BlockOptions = { common: this._common }
    if (blockNumber === BigInt(0)) {
      opts.hardforkByTTD = await this.getTotalDifficulty(blockHash, BigInt(0))
    } else {
      // Lets fetch the parent hash but not by number since this block might not
      // be in canonical chain
      const headerData = valuesArrayToHeaderData(headerValues as Buffer[])
      const parentHash = headerData.parentHash as Buffer
      opts.hardforkByTTD = await this.getTotalDifficulty(parentHash, blockNumber - BigInt(1))
    }
    return BlockHeader.fromValuesArray(headerValues as Buffer[], opts)
  }

  /**
   * Fetches total difficulty for a block given its hash and number.
   */
  async getTotalDifficulty(blockHash: Buffer, blockNumber: bigint): Promise<bigint> {
    const td = await this.get(DBTarget.TotalDifficulty, { blockHash, blockNumber })
    return bufferToBigInt(Buffer.from(RLP.decode(Uint8Array.from(td)) as Uint8Array))
  }

  /**
   * Performs a block hash to block number lookup.
   */
  async hashToNumber(blockHash: Buffer): Promise<bigint> {
    const value = await this.get(DBTarget.HashToNumber, { blockHash })
    return bufferToBigInt(value)
  }

  /**
   * Performs a block number to block hash lookup.
   */
  async numberToHash(blockNumber: bigint): Promise<Buffer> {
    if (blockNumber < BigInt(0)) {
      throw new NotFoundError(blockNumber)
    }

    return this.get(DBTarget.NumberToHash, { blockNumber })
  }

  /**
   * Fetches a key from the db. If `opts.cache` is specified
   * it first tries to load from cache, and on cache miss will
   * try to put the fetched item on cache afterwards.
   */
  async get(dbOperationTarget: DBTarget, key?: DatabaseKey): Promise<any> {
    const dbGetOperation = DBOp.get(dbOperationTarget, key)

    const cacheString = dbGetOperation.cacheString
    const dbKey = dbGetOperation.baseDBOp.key
    const dbOpts = dbGetOperation.baseDBOp

    if (cacheString !== undefined) {
      if (this._cache[cacheString] === undefined) {
        throw new Error(`Invalid cache: ${cacheString}`)
      }

      let value = this._cache[cacheString].get(dbKey)
      if (!value) {
        value = await this._db.get(dbKey, dbOpts)

        if (value) {
          this._cache[cacheString].set(dbKey, value)
        }
      }

      return value
    }

    return this._db.get(dbKey, dbOpts)
  }

  /**
   * Performs a batch operation on db.
   */
  async batch(ops: DBOp[]) {
    const convertedOps: DBOpData[] = ops.map((op) => op.baseDBOp)
    // update the current cache for each operation
    ops.map((op) => op.updateCache(this._cache))

    return this._db.batch(convertedOps as any)
  }
}
