import { BN } from "@coral-xyz/anchor";
import * as Instructions from "./rpc_client/instructions";
import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  accountExist,
  createAtaInstruction,
  getAssociatedTokenAddress,
  getClaimStatusPDA,
} from "./utils";
import Decimal from "decimal.js";
import { PROGRAM_ID } from "./rpc_client/programId";
import { ClaimStatus, MerkleDistributor } from "./rpc_client/accounts";
import { NewClaimAccounts } from "./rpc_client/instructions/newClaim";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

export class Distributor {
  private readonly _connection: Connection;
  private readonly _distributorProgramId: PublicKey;

  constructor(connection: Connection) {
    this._connection = connection;
    this._distributorProgramId = PROGRAM_ID;
  }

  getConnection() {
    return this._connection;
  }

  getProgramID() {
    return this._distributorProgramId;
  }

  async userClaimed(
    merkleDistributorAddress: PublicKey,
    user: PublicKey,
  ): Promise<boolean> {
    const claimStatusAddress = getClaimStatusPDA(
      user,
      merkleDistributorAddress,
      this.getProgramID(),
    );

    const claimStatus = await ClaimStatus.fetch(
      this.getConnection(),
      claimStatusAddress,
    );
    if (!claimStatus) {
      return false;
    } else {
      return true;
    }
  }

  async isClaimable(
    merkleDistributorAddress: PublicKey,
  ): Promise<boolean> {
    const merkleDistributorState = await MerkleDistributor.fetch(
      this._connection,
      merkleDistributorAddress,
    );

    if(!merkleDistributorState) {
      throw new Error("Merkle Distributor not found");
    }

    const currentSlot = await this._connection.getSlot();

    if (new Decimal(merkleDistributorState.enableSlot.toString()).toNumber() >= currentSlot) {
      return false;
    } else {
      return true;
    }
  }

  async getNewClaimIx(
    merkleDistributorAddress: PublicKey,
    user: PublicKey,
    amountLamports: number,
    proof: number[][],
  ): Promise<TransactionInstruction[]> {
    const claimStatusAddress = getClaimStatusPDA(
      user,
      merkleDistributorAddress,
      this.getProgramID(),
    );
    const merkleDistributor = await MerkleDistributor.fetch(
      this._connection,
      merkleDistributorAddress,
    );
    const userAta = await getAssociatedTokenAddress(
      user,
      merkleDistributor?.mint!,
    );
    const ixs: TransactionInstruction[] = [];
    if (!(await accountExist(this._connection, userAta))) {
      ixs.push(
        await createAtaInstruction(user, merkleDistributor?.mint!, userAta),
      );
    }

    const accounts: NewClaimAccounts = {
      distributor: merkleDistributorAddress,
      claimStatus: claimStatusAddress,
      from: merkleDistributor?.tokenVault!,
      to: userAta,
      claimant: user,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    };

    const args: Instructions.NewClaimArgs = {
      amountUnlocked: new BN(amountLamports),
      amountLocked: new BN(0),
      proof: proof.map((hashArray) => Array.from(hashArray)),
    };

    ixs.push(Instructions.newClaim(args, accounts));

    return ixs;
  }

  async getMultipleDistributorStats(
    distributors: PublicKey[],
  ): Promise<DistributionStats> {
    const distributorsStats: DistributorStats[] = [];
    let distributionTotalClaimed: Decimal = new Decimal(0);
    let distributionMaxTotalClaim: Decimal = new Decimal(0);
    let distributionTotalUsers: number = 0;
    let distributionTotalUsersClaimed: number = 0;

    const merkleDistributors = await MerkleDistributor.fetchMultiple(
      this._connection,
      distributors,
    );

    for (const [index, merkleDistributor] of merkleDistributors.entries()) {
      if (!merkleDistributor) {
        throw new Error(
          `Distributor ${distributors[index].toString()} not found`,
        );
      }
      const stats = this.getDistributorStats(
        merkleDistributor,
        distributors[index],
      );
      distributorsStats.push(stats);
      distributionTotalClaimed = distributionTotalClaimed.add(
        stats.totalClaimed,
      );
      distributionMaxTotalClaim = distributionMaxTotalClaim.add(
        stats.maxTotalClaim,
      );
      distributionTotalUsers += stats.totalUsers;
      distributionTotalUsersClaimed += stats.totalUsersClaimed;
    }

    return {
      distributors: distributorsStats,
      distributionTotalClaimed,
      distributionMaxTotalClaim,
      distributionTotalUsers,
      distributionTotalUsersClaimed,
    };
  }

  async getSingleDistributorStats(
    distributorAddress: PublicKey,
  ): Promise<DistributorStats> {
    const merkleDistributor = await MerkleDistributor.fetch(
      this._connection,
      distributorAddress,
    );
    if (!merkleDistributor) {
      throw new Error("Distributor not found");
    }

    return this.getDistributorStats(merkleDistributor, distributorAddress);
  }

  getDistributorStats(
    distributor: MerkleDistributor,
    distributorAddress: PublicKey,
  ): DistributorStats {
    const totalClaimed = new Decimal(distributor.totalAmountClaimed.toString());
    const maxTotalClaim = new Decimal(distributor.maxTotalClaim.toString()).sub(
      totalClaimed,
    );
    const totalUsersClaimed = new Decimal(
      distributor.numNodesClaimed.toString(),
    ).toNumber();
    const totalUsers = new Decimal(
      distributor.maxNumNodes.toString(),
    ).toNumber();

    return {
      address: distributorAddress,
      totalClaimed,
      maxTotalClaim,
      totalUsers,
      totalUsersClaimed,
      state: distributor,
    };
  }
}

export type DistributorStats = {
  address: PublicKey;
  totalClaimed: Decimal;
  maxTotalClaim: Decimal;
  totalUsers: number;
  totalUsersClaimed: number;
  state: MerkleDistributor;
};

export type DistributionStats = {
  distributors: DistributorStats[];
  distributionTotalClaimed: Decimal;
  distributionMaxTotalClaim: Decimal;
  distributionTotalUsers: number;
  distributionTotalUsersClaimed: number;
};
