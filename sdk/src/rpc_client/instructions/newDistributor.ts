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

export const DISCRIMINATOR = Buffer.from([32, 139, 112, 171, 0, 2, 225, 155])

export interface NewDistributorArgs {
  version: BN
  root: Array<number>
  maxTotalClaim: BN
  maxNumNodes: BN
  startVestingTs: BN
  endVestingTs: BN
  clawbackStartTs: BN
  enableSlot: BN
  closable: boolean
}

export interface NewDistributorAccounts {
  /** [MerkleDistributor]. */
  distributor: Address
  /** Base key of the distributor. */
  base: TransactionSigner
  /** Clawback receiver token account */
  clawbackReceiver: Address
  /** The mint to distribute. */
  mint: Address
  /**
   * Token vault
   * Should create previously
   */
  tokenVault: Address
  /**
   * Admin wallet, responsible for creating the distributor and paying for the transaction.
   * Also has the authority to set the clawback receiver and change itself.
   */
  admin: TransactionSigner
  /** The [System] program. */
  systemProgram: Address
  /** The [Associated Token] program. */
  associatedTokenProgram: Address
  /** The [Token] program. */
  tokenProgram: Address
}

export const layout = borsh.struct<NewDistributorArgs>([
  borsh.u64("version"),
  borsh.array(borsh.u8(), 32, "root"),
  borsh.u64("maxTotalClaim"),
  borsh.u64("maxNumNodes"),
  borsh.i64("startVestingTs"),
  borsh.i64("endVestingTs"),
  borsh.i64("clawbackStartTs"),
  borsh.u64("enableSlot"),
  borsh.bool("closable"),
])

/**
 * READ THE FOLLOWING:
 *
 * This instruction is susceptible to frontrunning that could result in loss of funds if not handled properly.
 *
 * An attack could look like:
 * - A legitimate user opens a new distributor.
 * - Someone observes the call to this instruction.
 * - They replace the clawback_receiver, admin, or time parameters with their own.
 *
 * One situation that could happen here is the attacker replaces the admin and clawback_receiver with their own
 * and sets the clawback_start_ts with the minimal time allowed. After clawback_start_ts has elapsed,
 * the attacker can steal all funds from the distributor to their own clawback_receiver account.
 *
 * HOW TO AVOID:
 * - When you call into this instruction, ensure your transaction succeeds.
 * - To be extra safe, after your transaction succeeds, read back the state of the created MerkleDistributor account and
 * assert the parameters are what you expect, most importantly the clawback_receiver and admin.
 * - If your transaction fails, double check the value on-chain matches what you expect.
 */
export function newDistributor(
  args: NewDistributorArgs,
  accounts: NewDistributorAccounts,
  remainingAccounts: Array<AccountMeta | AccountSignerMeta> = [],
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<AccountMeta | AccountSignerMeta> = [
    { address: accounts.distributor, role: 1 },
    { address: accounts.base.address, role: 2, signer: accounts.base },
    { address: accounts.clawbackReceiver, role: 1 },
    { address: accounts.mint, role: 0 },
    { address: accounts.tokenVault, role: 0 },
    { address: accounts.admin.address, role: 3, signer: accounts.admin },
    { address: accounts.systemProgram, role: 0 },
    { address: accounts.associatedTokenProgram, role: 0 },
    { address: accounts.tokenProgram, role: 0 },
    ...remainingAccounts,
  ]
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      version: args.version,
      root: args.root,
      maxTotalClaim: args.maxTotalClaim,
      maxNumNodes: args.maxNumNodes,
      startVestingTs: args.startVestingTs,
      endVestingTs: args.endVestingTs,
      clawbackStartTs: args.clawbackStartTs,
      enableSlot: args.enableSlot,
      closable: args.closable,
    },
    buffer
  )
  const data = Buffer.concat([DISCRIMINATOR, buffer]).slice(0, 8 + len)
  const ix: Instruction = { accounts: keys, programAddress, data }
  return ix
}
