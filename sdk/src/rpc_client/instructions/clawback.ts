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

export const DISCRIMINATOR = Buffer.from([111, 92, 142, 79, 33, 234, 82, 27])

export interface ClawbackAccounts {
  /** The [MerkleDistributor]. */
  distributor: Address
  /** Distributor ATA containing the tokens to distribute. */
  from: Address
  /** The Clawback token account. */
  to: Address
  /**
   * Claimant account
   * Anyone can claw back the funds
   */
  claimant: TransactionSigner
  /** The [System] program. */
  systemProgram: Address
  /** SPL [Token] program. */
  tokenProgram: Address
}

export function clawback(
  accounts: ClawbackAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.distributor, role: 1 },
    { address: accounts.from, role: 1 },
    { address: accounts.to, role: 1 },
    { address: accounts.claimant.address, role: 2, signer: accounts.claimant },
    { address: accounts.systemProgram, role: 0 },
    { address: accounts.tokenProgram, role: 0 },
    ...remainingAccounts,
  ]
  const data = DISCRIMINATOR
  const ix: Instruction = { accounts: keys, programAddress, data }
  return ix
}
