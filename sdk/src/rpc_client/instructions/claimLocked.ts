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

export const DISCRIMINATOR = Buffer.from([34, 206, 181, 23, 11, 207, 147, 90])

export interface ClaimLockedAccounts {
  /** The [MerkleDistributor]. */
  distributor: Address
  /** Claim Status PDA */
  claimStatus: Address
  /** Distributor ATA containing the tokens to distribute. */
  from: Address
  /**
   * Account to send the claimed tokens to.
   * Claimant must sign the transaction and can only claim on behalf of themself
   */
  to: Address
  /** Who is claiming the tokens. */
  claimant: TransactionSigner
  /** SPL [Token] program. */
  tokenProgram: Address
}

export function claimLocked(
  accounts: ClaimLockedAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.distributor, role: 1 },
    { address: accounts.claimStatus, role: 1 },
    { address: accounts.from, role: 1 },
    { address: accounts.to, role: 1 },
    { address: accounts.claimant.address, role: 3, signer: accounts.claimant },
    { address: accounts.tokenProgram, role: 0 },
    ...remainingAccounts,
  ]
  const data = DISCRIMINATOR
  const ix: Instruction = { accounts: keys, programAddress, data }
  return ix
}
