/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  address,
  Address,
  fetchEncodedAccount,
  fetchEncodedAccounts,
  GetAccountInfoApi,
  GetMultipleAccountsApi,
  Rpc,
} from "@solana/kit"
/* eslint-enable @typescript-eslint/no-unused-vars */
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@coral-xyz/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { borshAddress } from "../utils" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface ClaimStatusFields {
  /** Authority that claimed the tokens. */
  claimant: Address
  /** Locked amount */
  lockedAmount: BN
  /** Locked amount withdrawn */
  lockedAmountWithdrawn: BN
  /** Unlocked amount */
  unlockedAmount: BN
  /** indicate that whether admin can close this account, for testing purpose */
  closable: boolean
  /** admin of merkle tree, store for for testing purpose */
  admin: Address
}

export interface ClaimStatusJSON {
  /** Authority that claimed the tokens. */
  claimant: string
  /** Locked amount */
  lockedAmount: string
  /** Locked amount withdrawn */
  lockedAmountWithdrawn: string
  /** Unlocked amount */
  unlockedAmount: string
  /** indicate that whether admin can close this account, for testing purpose */
  closable: boolean
  /** admin of merkle tree, store for for testing purpose */
  admin: string
}

/** Holds whether or not a claimant has claimed tokens. */
export class ClaimStatus {
  /** Authority that claimed the tokens. */
  readonly claimant: Address
  /** Locked amount */
  readonly lockedAmount: BN
  /** Locked amount withdrawn */
  readonly lockedAmountWithdrawn: BN
  /** Unlocked amount */
  readonly unlockedAmount: BN
  /** indicate that whether admin can close this account, for testing purpose */
  readonly closable: boolean
  /** admin of merkle tree, store for for testing purpose */
  readonly admin: Address

  static readonly discriminator = Buffer.from([
    22, 183, 249, 157, 247, 95, 150, 96,
  ])

  static readonly layout = borsh.struct<ClaimStatus>([
    borshAddress("claimant"),
    borsh.u64("lockedAmount"),
    borsh.u64("lockedAmountWithdrawn"),
    borsh.u64("unlockedAmount"),
    borsh.bool("closable"),
    borshAddress("admin"),
  ])

  constructor(fields: ClaimStatusFields) {
    this.claimant = fields.claimant
    this.lockedAmount = fields.lockedAmount
    this.lockedAmountWithdrawn = fields.lockedAmountWithdrawn
    this.unlockedAmount = fields.unlockedAmount
    this.closable = fields.closable
    this.admin = fields.admin
  }

  static async fetch(
    rpc: Rpc<GetAccountInfoApi>,
    address: Address,
    programId: Address = PROGRAM_ID
  ): Promise<ClaimStatus | null> {
    const info = await fetchEncodedAccount(rpc, address)

    if (!info.exists) {
      return null
    }
    if (info.programAddress !== programId) {
      throw new Error(
        `ClaimStatusFields account ${address} belongs to wrong program ${info.programAddress}, expected ${programId}`
      )
    }

    return this.decode(Buffer.from(info.data))
  }

  static async fetchMultiple(
    rpc: Rpc<GetMultipleAccountsApi>,
    addresses: Address[],
    programId: Address = PROGRAM_ID
  ): Promise<Array<ClaimStatus | null>> {
    const infos = await fetchEncodedAccounts(rpc, addresses)

    return infos.map((info) => {
      if (!info.exists) {
        return null
      }
      if (info.programAddress !== programId) {
        throw new Error(
          `ClaimStatusFields account ${info.address} belongs to wrong program ${info.programAddress}, expected ${programId}`
        )
      }

      return this.decode(Buffer.from(info.data))
    })
  }

  static decode(data: Buffer): ClaimStatus {
    if (!data.slice(0, 8).equals(ClaimStatus.discriminator)) {
      throw new Error("invalid account discriminator")
    }

    const dec = ClaimStatus.layout.decode(data.slice(8))

    return new ClaimStatus({
      claimant: dec.claimant,
      lockedAmount: dec.lockedAmount,
      lockedAmountWithdrawn: dec.lockedAmountWithdrawn,
      unlockedAmount: dec.unlockedAmount,
      closable: dec.closable,
      admin: dec.admin,
    })
  }

  toJSON(): ClaimStatusJSON {
    return {
      claimant: this.claimant,
      lockedAmount: this.lockedAmount.toString(),
      lockedAmountWithdrawn: this.lockedAmountWithdrawn.toString(),
      unlockedAmount: this.unlockedAmount.toString(),
      closable: this.closable,
      admin: this.admin,
    }
  }

  static fromJSON(obj: ClaimStatusJSON): ClaimStatus {
    return new ClaimStatus({
      claimant: address(obj.claimant),
      lockedAmount: new BN(obj.lockedAmount),
      lockedAmountWithdrawn: new BN(obj.lockedAmountWithdrawn),
      unlockedAmount: new BN(obj.unlockedAmount),
      closable: obj.closable,
      admin: address(obj.admin),
    })
  }
}
