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

export const DISCRIMINATOR = Buffer.from([78, 177, 98, 123, 210, 21, 187, 83])

export interface NewClaimArgs {
  amountUnlocked: BN
  amountLocked: BN
  proof: Array<Array<number>>
}

export interface NewClaimAccounts {
  /** The [MerkleDistributor]. */
  distributor: Address
  /** Claim status PDA */
  claimStatus: Address
  /** Distributor ATA containing the tokens to distribute. */
  from: Address
  /** Account to send the claimed tokens to. */
  to: Address
  /** Who is claiming the tokens. */
  claimant: TransactionSigner
  /** SPL [Token] program. */
  tokenProgram: Address
  /** The [System] program. */
  systemProgram: Address
}

export const layout = borsh.struct<NewClaimArgs>([
  borsh.u64("amountUnlocked"),
  borsh.u64("amountLocked"),
  borsh.vec(borsh.array(borsh.u8(), 32), "proof"),
])

export function newClaim(
  args: NewClaimArgs,
  accounts: NewClaimAccounts,
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
    { address: accounts.systemProgram, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      amountUnlocked: args.amountUnlocked,
      amountLocked: args.amountLocked,
      proof: args.proof,
    },
    buffer
  )
  const data = Buffer.concat([DISCRIMINATOR, buffer]).slice(0, 8 + len)
  const ix: Instruction = { accounts: keys, programAddress, data }
  return ix
}
