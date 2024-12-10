import { PublicKey, Connection } from "@solana/web3.js"
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@coral-xyz/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface ClaimStatusFields {
  /** Authority that claimed the tokens. */
  claimant: PublicKey
  /** Locked amount */
  lockedAmount: BN
  /** Locked amount withdrawn */
  lockedAmountWithdrawn: BN
  /** Unlocked amount */
  unlockedAmount: BN
  /** indicate that whether admin can close this account, for testing purpose */
  closable: boolean
  /** admin of merkle tree, store for for testing purpose */
  admin: PublicKey
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
  readonly claimant: PublicKey
  /** Locked amount */
  readonly lockedAmount: BN
  /** Locked amount withdrawn */
  readonly lockedAmountWithdrawn: BN
  /** Unlocked amount */
  readonly unlockedAmount: BN
  /** indicate that whether admin can close this account, for testing purpose */
  readonly closable: boolean
  /** admin of merkle tree, store for for testing purpose */
  readonly admin: PublicKey

  static readonly discriminator = Buffer.from([
    22, 183, 249, 157, 247, 95, 150, 96,
  ])

  static readonly layout = borsh.struct([
    borsh.publicKey("claimant"),
    borsh.u64("lockedAmount"),
    borsh.u64("lockedAmountWithdrawn"),
    borsh.u64("unlockedAmount"),
    borsh.bool("closable"),
    borsh.publicKey("admin"),
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
    c: Connection,
    address: PublicKey,
    programId: PublicKey = PROGRAM_ID
  ): Promise<ClaimStatus | null> {
    const info = await c.getAccountInfo(address)

    if (info === null) {
      return null
    }
    if (!info.owner.equals(programId)) {
      throw new Error("account doesn't belong to this program")
    }

    return this.decode(info.data)
  }

  static async fetchMultiple(
    c: Connection,
    addresses: PublicKey[],
    programId: PublicKey = PROGRAM_ID
  ): Promise<Array<ClaimStatus | null>> {
    const infos = await c.getMultipleAccountsInfo(addresses)

    return infos.map((info) => {
      if (info === null) {
        return null
      }
      if (!info.owner.equals(programId)) {
        throw new Error("account doesn't belong to this program")
      }

      return this.decode(info.data)
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
      claimant: this.claimant.toString(),
      lockedAmount: this.lockedAmount.toString(),
      lockedAmountWithdrawn: this.lockedAmountWithdrawn.toString(),
      unlockedAmount: this.unlockedAmount.toString(),
      closable: this.closable,
      admin: this.admin.toString(),
    }
  }

  static fromJSON(obj: ClaimStatusJSON): ClaimStatus {
    return new ClaimStatus({
      claimant: new PublicKey(obj.claimant),
      lockedAmount: new BN(obj.lockedAmount),
      lockedAmountWithdrawn: new BN(obj.lockedAmountWithdrawn),
      unlockedAmount: new BN(obj.unlockedAmount),
      closable: obj.closable,
      admin: new PublicKey(obj.admin),
    })
  }
}
