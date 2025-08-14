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

export const DISCRIMINATOR = Buffer.from([202, 56, 180, 143, 46, 104, 106, 112])

export interface CloseDistributorAccounts {
  /** [MerkleDistributor]. */
  distributor: Address
  /** Clawback receiver token account */
  tokenVault: Address
  /**
   * Admin wallet, responsible for creating the distributor and paying for the transaction.
   * Also has the authority to set the clawback receiver and change itself.
   */
  admin: TransactionSigner
  /** account receive token back */
  destinationTokenAccount: Address
  /** The [Token] program. */
  tokenProgram: Address
}

/** only available in test phase */
export function closeDistributor(
  accounts: CloseDistributorAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.distributor, role: 1 },
    { address: accounts.tokenVault, role: 1 },
    { address: accounts.admin.address, role: 3, signer: accounts.admin },
    { address: accounts.destinationTokenAccount, role: 1 },
    { address: accounts.tokenProgram, role: 0 },
    ...remainingAccounts,
  ]
  const data = DISCRIMINATOR
  const ix: Instruction = { accounts: keys, programAddress, data }
  return ix
}
