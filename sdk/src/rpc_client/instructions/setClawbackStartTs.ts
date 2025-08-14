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

export const DISCRIMINATOR = Buffer.from([83, 102, 71, 44, 243, 244, 186, 8])

export interface SetClawbackStartTsArgs {
  clawbackStartTs: BN
}

export interface SetClawbackStartTsAccounts {
  /** [MerkleDistributor]. */
  distributor: Address
  /** Payer to create the distributor. */
  admin: TransactionSigner
}

export const layout = borsh.struct<SetClawbackStartTsArgs>([
  borsh.i64("clawbackStartTs"),
])

export function setClawbackStartTs(
  args: SetClawbackStartTsArgs,
  accounts: SetClawbackStartTsAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.distributor, role: 1 },
    { address: accounts.admin.address, role: 3, signer: accounts.admin },
    ...remainingAccounts,
  ]
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      clawbackStartTs: args.clawbackStartTs,
    },
    buffer
  )
  const data = Buffer.concat([DISCRIMINATOR, buffer]).slice(0, 8 + len)
  const ix: Instruction = { accounts: keys, programAddress, data }
  return ix
}
