import { TransactionInstruction, PublicKey, AccountMeta } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@coral-xyz/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface CloseDistributorAccounts {
  /** [MerkleDistributor]. */
  distributor: PublicKey
  /** Clawback receiver token account */
  tokenVault: PublicKey
  /**
   * Admin wallet, responsible for creating the distributor and paying for the transaction.
   * Also has the authority to set the clawback receiver and change itself.
   */
  admin: PublicKey
  /** account receive token back */
  destinationTokenAccount: PublicKey
  /** The [Token] program. */
  tokenProgram: PublicKey
}

/** only available in test phase */
export function closeDistributor(
  accounts: CloseDistributorAccounts,
  programId: PublicKey = PROGRAM_ID
) {
  const keys: Array<AccountMeta> = [
    { pubkey: accounts.distributor, isSigner: false, isWritable: true },
    { pubkey: accounts.tokenVault, isSigner: false, isWritable: true },
    { pubkey: accounts.admin, isSigner: true, isWritable: true },
    {
      pubkey: accounts.destinationTokenAccount,
      isSigner: false,
      isWritable: true,
    },
    { pubkey: accounts.tokenProgram, isSigner: false, isWritable: false },
  ]
  const identifier = Buffer.from([202, 56, 180, 143, 46, 104, 106, 112])
  const data = identifier
  const ix = new TransactionInstruction({ keys, programId, data })
  return ix
}
