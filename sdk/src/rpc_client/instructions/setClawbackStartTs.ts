import { TransactionInstruction, PublicKey, AccountMeta } from "@solana/web3.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@coral-xyz/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface SetClawbackStartTsArgs {
  clawbackStartTs: BN
}

export interface SetClawbackStartTsAccounts {
  /** [MerkleDistributor]. */
  distributor: PublicKey
  /** Payer to create the distributor. */
  admin: PublicKey
}

export const layout = borsh.struct([borsh.i64("clawbackStartTs")])

export function setClawbackStartTs(
  args: SetClawbackStartTsArgs,
  accounts: SetClawbackStartTsAccounts,
  programId: PublicKey = PROGRAM_ID
) {
  const keys: Array<AccountMeta> = [
    { pubkey: accounts.distributor, isSigner: false, isWritable: true },
    { pubkey: accounts.admin, isSigner: true, isWritable: true },
  ]
  const identifier = Buffer.from([83, 102, 71, 44, 243, 244, 186, 8])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      clawbackStartTs: args.clawbackStartTs,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix = new TransactionInstruction({ keys, programId, data })
  return ix
}
