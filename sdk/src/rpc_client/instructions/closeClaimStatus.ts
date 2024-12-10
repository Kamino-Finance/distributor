import { TransactionInstruction, PublicKey, AccountMeta } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@coral-xyz/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface CloseClaimStatusAccounts {
  claimStatus: PublicKey
  claimant: PublicKey
  admin: PublicKey
}

/** only available in test phase */
export function closeClaimStatus(
  accounts: CloseClaimStatusAccounts,
  programId: PublicKey = PROGRAM_ID
) {
  const keys: Array<AccountMeta> = [
    { pubkey: accounts.claimStatus, isSigner: false, isWritable: true },
    { pubkey: accounts.claimant, isSigner: false, isWritable: true },
    { pubkey: accounts.admin, isSigner: true, isWritable: false },
  ]
  const identifier = Buffer.from([163, 214, 191, 165, 245, 188, 17, 185])
  const data = identifier
  const ix = new TransactionInstruction({ keys, programId, data })
  return ix
}
