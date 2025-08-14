#!/usr/bin/env npx ts-node
import { Command } from "commander";
import {
  ApiFormatData,
  ClaimApiResponse,
  createAddExtraComputeUnitFeeTransaction,
  fetchUserDataFromApi,
  initializeClient,
  noopProfiledFunctionExecution,
  parseKeypairFile,
  printSimulateTx,
  readCsv,
  readMerkleTreesDirectory,
  retryAsync,
  sleep,
  UserClaim,
} from "./utils";
import { Distributor } from "./Distributor";
import * as fs from "fs";
import Decimal from "decimal.js";
import { lamportsToCollDecimal } from "./utils";
import {
  Address,
  address,
  appendTransactionMessageInstructions,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  Instruction,
  pipe,
  Rpc,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  SolanaRpcApi,
} from "@solana/kit";

const microLamport = 5 * 10 ** 6; // 1 lamport
const computeUnits = 1_000_000;
const microLamportsPrioritizationFee = microLamport / computeUnits;

require("dotenv").config();

async function main() {
  const commands = new Command();

  commands
    .name("distributor-cli")
    .description("CLI to interact with the MerkleDistributor program");

  commands
    .command("get-distributor-stats")
    .requiredOption("--distributor-address, <string>", "Distributor address")
    .action(async ({ distributorAddress }) => {
      const { rpc } = await initializeClient();
      const distributorClient = new Distributor(rpc);
      const distributorStats =
        await distributorClient.getSingleDistributorStats(
          address(distributorAddress),
        );

      console.log(JSON.parse(JSON.stringify(distributorStats)));
    });

  commands
    .command("get-all-distributors-stats-from-distributor-file")
    .requiredOption("--distributors-file, <string>", "Distributor file")
    .action(async ({ distributorsFile }) => {
      const { rpc } = await initializeClient();
      const distributorClient = new Distributor(rpc);

      const rawData = fs.readFileSync(distributorsFile, "utf8");
      const distributors: string[] = JSON.parse(rawData);

      const distributorsStats =
        await distributorClient.getMultipleDistributorStats(
          distributors.map((distributor) => address(distributor)),
        );

      console.log(
        JSON.parse(
          JSON.stringify({
            claimed: distributorsStats.distributionTotalClaimed
              .div(10 ** 6)
              .toFixed(6),
            unclaimed: distributorsStats.distributionMaxTotalClaim
              .div(10 ** 6)
              .toFixed(6),
            walletsClaimed: distributorsStats.distributionTotalUsersClaimed,
            walletsUnclaimed:
              distributorsStats.distributionTotalUsers -
              distributorsStats.distributionTotalUsersClaimed,
          }),
        ),
      );
    });

  commands
    .command("claim")
    .requiredOption("--api-url, <string>", "Distributor file")
    .option(
      "--keypair, <string>",
      "keypair to be used instead of env file admin",
    )
    .option(
      "--mode <string>",
      "simulate - will print bs64 txn explorer link and simulation, execute - will execute",
    )
    .option(
      "--priority-fee-multiplier <string>",
      "the amount of priority fees to add - (multiply 1 lamport)",
    )
    .action(async ({ apiUrl, keypair, mode, priorityFeeMultiplier }) => {
      const { initialOwner, rpc, rpcWs } = await initializeClient();
      const distributorClient = new Distributor(rpc);
      let payer = initialOwner;
      if (keypair) {
        payer = await parseKeypairFile(keypair);
      }

      const apiResponse = await fetchUserDataFromApi(payer.address, apiUrl);

      const newClaimIxns = await distributorClient.getNewClaimIx(
        address(apiResponse.merkle_tree),
        payer,
        apiResponse.amount,
        apiResponse.proof,
      );

      const { value: blockhash } = await rpc.getLatestBlockhash().send();

      const ixs: Instruction[] = [];

      if (mode === "execute") {
        ixs.push(
          ...createAddExtraComputeUnitFeeTransaction(
            computeUnits,
            microLamportsPrioritizationFee *
              (priorityFeeMultiplier
                ? new Decimal(priorityFeeMultiplier).toNumber()
                : 1),
          ),
        );
      }

      ixs.push(...newClaimIxns);

      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayerSigner(payer, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(blockhash, tx),
        (tx) => appendTransactionMessageInstructions(ixs, tx),
      );

      const signedTransaction =
        await signTransactionMessageWithSigners(transactionMessage);
      if (mode === "execute") {
        console.log("Sending.");

        await sendAndConfirmTransactionFactory({
          rpc,
          rpcSubscriptions: rpcWs,
        })(signedTransaction, { commitment: "confirmed", skipPreflight: true });
        const sig = getSignatureFromTransaction(signedTransaction);
        console.log("Signature", sig);
      } else {
        await printSimulateTx(
          rpc,
          getBase64EncodedWireTransaction(signedTransaction),
        );
      }
    });

  commands
    .command("get-user-claimed")
    .requiredOption("--distributor-address, <string>", "Distributor address")
    .requiredOption("--user-address, <string>", "User address")
    .action(async ({ distributorAddress, userAddress }) => {
      const { rpc } = await initializeClient();
      const distributorClient = new Distributor(rpc);
      const claimed = await distributorClient.userClaimed(
        address(distributorAddress),
        address(userAddress),
      );

      console.log(claimed);
    });

  commands
    .command("check-user-claim-status")
    .requiredOption("--api-url-base, <string>", "API URL base")
    .option("--user-address, <string>", "User address to cehck against")
    .option("--user-address-file, <string>", "User address to cehck against")
    .action(async ({ apiUrlBase, userAddress, userAddressFile }) => {
      const { rpc } = await initializeClient();
      if (userAddressFile) {
        const rawData = fs.readFileSync(userAddressFile, "utf8");
        const users: string[] = JSON.parse(rawData);

        for (const user of users) {
          await checkUserClaimStatus(address(user), rpc, apiUrlBase);
        }
      } else if (userAddress) {
        const user = address(userAddress);
        await checkUserClaimStatus(user, rpc, apiUrlBase);
      }
    });

  commands
    .command("check-api-returns-all-keys")
    .requiredOption("--api-url, <string>", "Distributor file")
    .requiredOption("--csv-path, <string>", "Csv for distribution path")
    .requiredOption("--decimals-in-csv, <string>", "Decimals in CSV")
    .option("--merkle-tree-path, <string>", "merkle tree path")
    .action(async ({ apiUrl, csvPath, decimalsInCsv, merkleTreePath }) => {
      const userClaimsFromCsv = readCsv(csvPath, decimalsInCsv);
      const merkleTreesData = merkleTreePath
        ? readMerkleTreesDirectory(merkleTreePath)
        : new Map<string, ApiFormatData>();
      const batchSize = 1000;

      const resultPromises: Promise<boolean>[] = [];
      for (
        let batchIndex = 0;
        batchIndex < userClaimsFromCsv.length;
        batchIndex += batchSize
      ) {
        console.log(
          `Checking users [${batchIndex}, ${batchIndex + batchSize - 1}]`,
        );
        const batch = userClaimsFromCsv.slice(
          batchIndex,
          batchIndex + batchSize,
        );
        for (const [index, userClaim] of batch.entries()) {
          resultPromises.push(
            checkAgainstApi(userClaim, apiUrl, merkleTreePath, merkleTreesData),
          );
        }
        const results = await Promise.all(resultPromises);
        for (const result of results) {
          if (!result) {
            throw new Error("Verification failed");
          }
        }
        await sleep(10500);
      }

      console.log(
        "Verification succesfully completed!\n\nAPI data returned fully matches CSV data and MERKLE_TREE data!",
      );
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

async function checkAgainstApi(
  userClaim: UserClaim,
  apiUrl: any,
  merkleTreePath: any,
  merkleTreesData: Map<string, ApiFormatData>,
): Promise<boolean> {
  // get response for each user
  const apiResponse: ClaimApiResponse = await retryAsync(async () =>
    noopProfiledFunctionExecution(
      fetchUserDataFromApi(userClaim.address, apiUrl),
    ),
  );
  // check amount against csv
  if (apiResponse.amount !== userClaim.amount) {
    throw new Error(
      `Amount mismatch compared to CSV for user ${userClaim.address.toString()}, csv: ${userClaim.amount}, api: ${apiResponse.amount}`,
    );
  }
  // check merkle_tree, amount and proof against each merkle_tree field
  if (merkleTreePath) {
    const merkleTreeData = merkleTreesData.get(userClaim.address.toString());
    if (!merkleTreeData) {
      throw new Error(
        `User ${userClaim.address.toString()} not found in merkle tree`,
      );
    }
    if (merkleTreeData.amount !== apiResponse.amount) {
      throw new Error(
        `Amount mismatch compared to MERKLE_TREE_FILE for user ${userClaim.address.toString()}, merkleTreeData: ${apiResponse.amount}, api: ${userClaim.amount}`,
      );
    }
    // compare proofs
    for (const [
      indexArrayProof,
      arrayProof,
    ] of merkleTreeData.proof.entries()) {
      for (let i = 0; i < arrayProof.length; i++) {
        if (arrayProof[i] !== apiResponse.proof[indexArrayProof][i]) {
          throw new Error(
            `Proof mismatch for user ${userClaim.address.toString()}`,
          );
        }
      }
    }
  }

  return true;
}

async function checkUserClaimStatus(
  user: Address,
  rpc: Rpc<SolanaRpcApi>,
  apiUrlBase: string,
) {
  const apiResponse: ClaimApiResponse = await retryAsync(async () =>
    noopProfiledFunctionExecution(fetchUserDataFromApi(user, apiUrlBase)),
  );

  if (apiResponse.merkle_tree === undefined) {
    console.log("User " + user.toString() + " had no allocation");
    return;
  }

  const merkleDistributor = address(apiResponse.merkle_tree);

  const distributorClient = new Distributor(rpc);
  const claimed = await distributorClient.userClaimed(
    address(merkleDistributor),
    address(user),
  );

  if (claimed) {
    console.log(
      "User " +
        user.toString() +
        " has already claimed his allocation: " +
        lamportsToCollDecimal(new Decimal(apiResponse.amount), 6).toString(),
    );
  } else {
    console.log(
      "User " +
        user.toString() +
        " has not claimed his allocation: " +
        lamportsToCollDecimal(new Decimal(apiResponse.amount), 6).toString(),
    );
  }
}
