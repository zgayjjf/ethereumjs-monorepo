import { Account, Address } from 'ethereumjs-util'
import { Proof } from './stateManager'

/**
 * Storage values of an account
 */
export interface StorageDump {
  [key: string]: string
}

export type AccountFields = Partial<Pick<Account, 'nonce' | 'balance' | 'stateRoot' | 'codeHash'>>

export interface StateManager {
  copy(): StateManager
  accountExists(address: Address): Promise<boolean>
  getAccount(address: Address): Promise<Account>
  putAccount(address: Address, account: Account): Promise<void>
  accountIsEmpty(address: Address): Promise<boolean>
  deleteAccount(address: Address): Promise<void>
  modifyAccountFields(address: Address, accountFields: AccountFields): Promise<void>
  putContractCode(address: Address, value: Buffer): Promise<void>
  getContractCode(address: Address): Promise<Buffer>
  getContractStorage(address: Address, key: Buffer): Promise<Buffer>
  putContractStorage(address: Address, key: Buffer, value: Buffer): Promise<void>
  clearContractStorage(address: Address): Promise<void>
  checkpoint(): Promise<void>
  commit(): Promise<void>
  revert(): Promise<void>
  getStateRoot(): Promise<Buffer>
  flush(): Promise<void>
  setStateRoot(stateRoot: Buffer): Promise<void>
  dumpStorage(address: Address): Promise<StorageDump>
  hasGenesisState(): Promise<boolean>
  getProof?(address: Address, storageSlots: Buffer[]): Promise<Proof>
  verifyProof?(proof: Proof): Promise<boolean>
}
