#!/usr/bin/env npx ts-node
import { Command } from "commander";
import { PublicKey, sendAndConfirmTransaction, Transaction } from "@solana/web3.js";
import { createAddExtraComputeUnitFeeTransaction, fetchUserDataFromApi, initializeClient, parseKeypairFile, printSimulateTx } from "./utils";
import { Distributor } from './Distributor';
import * as fs from 'fs';
import Decimal from "decimal.js";

const microLamport = 5 * 10 ** 6; // 1 lamport
const computeUnits = 1_000_000;
const microLamportsPrioritizationFee = microLamport / computeUnits;

require('dotenv').config()

async function main() {
  const commands = new Command();

  commands
    .name("distributor-cli")
    .description("CLI to interact with the MerkleDistributor program");

  commands
    .command("get-distributor-stats")
    .requiredOption("--distributor-address, <string>", "Distributor address")
    .action(async ({ distributorAddress }) => {
      const { provider } = initializeClient();
      const distributorClient = new Distributor(provider.connection);
      const distributorStats = await distributorClient.getSingleDistributorStats(new PublicKey(distributorAddress));

      console.log(JSON.parse(JSON.stringify(distributorStats)));
    });

  commands
    .command("get-all-distributors-stats-from-distributor-file")
    .requiredOption("--distributors-file, <string>", "Distributor file")
    .action(async ({ distributorsFile }) => {
      const { provider } = initializeClient();
      const distributorClient = new Distributor(provider.connection);

      const rawData = fs.readFileSync(distributorsFile, "utf8");
      const distributors: string[] = JSON.parse(rawData);
      
      const distributorsStats = await distributorClient.getMultipleDistributorStats(distributors.map(distributor => new PublicKey(distributor)));

      console.log(JSON.parse(JSON.stringify({
        distributionTotalClaimed: distributorsStats.distributionTotalClaimed,
        distributionMaxTotalClaim: distributorsStats.distributionMaxTotalClaim,
        distributionTotalUsers: distributorsStats.distributionTotalUsers,
        distributionTotalUsersClaimed: distributorsStats.distributionTotalUsersClaimed
      })));
    });

  commands
    .command("claim")
    .requiredOption("--api-url, <string>", "Distributor file")
    .option("--keypair, <string>", "keypair to be used instead of env file admin")
    .option(
      "--mode <string>",
      "simulate - will print bs64 txn explorer link and simulation, execute - will execute",
    )
    .option(
      "--priority-fee-multiplier <string>",
      "the amount of priority fees to add - (multiply 1 lamport)",
    )
    .action(async ({ apiUrl, keypair, mode, priorityFeeMultiplier}) => {
      const { initialOwner, provider } = initializeClient();
      const distributorClient = new Distributor(provider.connection);
      let payer = initialOwner;
      if(keypair) {
        payer = parseKeypairFile(keypair);
      }

      const apiResponse =  await fetchUserDataFromApi(payer.publicKey, apiUrl);
      
      const newClaimIxns = await distributorClient.getNewClaimIx(new PublicKey(apiResponse.merkle_tree), payer.publicKey, apiResponse.amount, apiResponse.proof);

      const { blockhash } = await provider.connection.getLatestBlockhash();
      let txn = new Transaction();
      txn.recentBlockhash = blockhash;
      txn.feePayer = payer.publicKey;

      if (mode === "execute") {
        txn.add(...createAddExtraComputeUnitFeeTransaction(
          computeUnits,
          microLamportsPrioritizationFee * (priorityFeeMultiplier ? new Decimal(priorityFeeMultiplier).toNumber() : 1),
        ));
      }

      txn.add(...newClaimIxns);

      if (mode === "execute") {
        console.log("Sending.");
        const sig = await sendAndConfirmTransaction(
          provider.connection,
          txn,
          [payer],
          { skipPreflight: true, commitment: "confirmed" },
        );
        console.log("Signature", sig);
      } else {
        printSimulateTx(provider.connection, txn);
      }
    });

  commands
    .command("get-user-claimed")
    .requiredOption("--distributor-address, <string>", "Distributor address")
    .requiredOption("--user-address, <string>", "User address")
    .action(async ({ distributorAddress, userAddress }) => {
      const { provider } = initializeClient();
      const distributorClient = new Distributor(provider.connection);
      const claimed = await distributorClient.userClaimed(new PublicKey(distributorAddress), new PublicKey(userAddress));

      console.log(claimed);
    });

  await commands.parseAsync();
}

main()
  .then(() => {
    process.exit();
  })
  .catch((e) => {
    console.error("\n\nDistributor CLI exited with error:\n\n", e);
    process.exit(1);
  });
