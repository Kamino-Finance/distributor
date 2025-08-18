/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Address,
  isSome,
  AccountMeta,
  AccountSignerMeta,
  Instruction,
  Option,
  TransactionSigner,
} from "@solana/kit"
/* eslint-enable @typescript-eslint/no-unused-vars */
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@coral-xyz/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { borshAddress } from "../utils" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export const DISCRIMINATOR = Buffer.from([153, 217, 34, 20, 19, 29, 229, 75])

export interface SetClawbackReceiverAccounts {
  /** The [MerkleDistributor]. */
  distributor: Address
  /** New clawback account */
  newClawbackAccount: Address
  /** Admin signer */
  admin: TransactionSigner
}

export function setClawbackReceiver(
  accounts: SetClawbackReceiverAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.distributor, role: 1 },
    { address: accounts.newClawbackAccount, role: 0 },
    { address: accounts.admin.address, role: 3, signer: accounts.admin },
    ...remainingAccounts,
  ]
  const data = DISCRIMINATOR
  const ix: Instruction = { accounts: keys, programAddress, data }
  return ix
}
