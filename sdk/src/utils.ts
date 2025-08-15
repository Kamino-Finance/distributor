import * as anchor from "@coral-xyz/anchor";
import { ComputeBudgetProgram, PublicKey } from "@solana/web3.js";
import { Decimal } from "decimal.js";
import DISTRIBUTORIDL from "./rpc_client/merkle_distributor.json";
import * as fs from "fs";
import {
  address,
  Address,
  createKeyPairFromBytes,
  createSignerFromKeyPair,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  getAddressEncoder,
  getBase64EncodedWireTransaction,
  getProgramDerivedAddress,
  Instruction,
  KeyPairSigner,
  Rpc,
  RpcSubscriptions,
  SolanaRpcApi,
  Transaction,
} from "@solana/kit";
import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenInstructionAsync,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";
import {
  fromLegacyPublicKey,
  fromLegacyTransactionInstruction,
} from "@solana/compat";
import type { SolanaRpcSubscriptionsApi } from "@solana/rpc-subscriptions-api";

export const DISTRIBUTOR_IDL = DISTRIBUTORIDL as anchor.Idl;
export const WAD = new Decimal("1".concat(Array(18 + 1).join("0")));

export async function parseKeypairFile(file: string): Promise<KeyPairSigner> {
  const keypairFile = require("fs").readFileSync(file);
  const keypairBytes = new Uint8Array(JSON.parse(keypairFile.toString()));

  const keypair = await createKeyPairFromBytes(keypairBytes);

  return createSignerFromKeyPair(keypair);
}

export function collToLamportsDecimal(
  amount: Decimal,
  decimals: number,
): Decimal {
  let factor = Math.pow(10, decimals);
  return amount.mul(factor);
}

export function lamportsToCollDecimal(
  amount: Decimal,
  decimals: number,
): Decimal {
  let factor = Math.pow(10, decimals);
  return amount.div(factor);
}

export async function getAssociatedTokenAddress(
  ownerAddress: Address,
  tokenMintAddress: Address,
): Promise<Address> {
  const [associatedTokenAddress] = await findAssociatedTokenPda({
    mint: tokenMintAddress,
    owner: ownerAddress,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });
  return associatedTokenAddress;
}

export async function createAtaInstruction(
  owner: KeyPairSigner,
  tokenMintAddress: Address,
): Promise<Instruction> {
  return getCreateAssociatedTokenInstructionAsync({
    payer: owner,
    mint: tokenMintAddress,
    owner: owner.address,
  });
}

export async function getTokenAccountBalance(
  rpc: Rpc<SolanaRpcApi>,
  tokenAccount: Address,
): Promise<Decimal> {
  const tokenAccountBalance = await rpc
    .getTokenAccountBalance(tokenAccount)
    .send();
  return new Decimal(tokenAccountBalance.value.amount).div(
    Decimal.pow(10, tokenAccountBalance.value.decimals),
  );
}

export async function getSolBalanceInLamports(
  rpc: Rpc<SolanaRpcApi>,
  account: Address,
): Promise<bigint> {
  let balance: bigint | undefined = undefined;
  while (balance === undefined) {
    balance = (await rpc.getAccountInfo(account).send())?.value?.lamports;
  }
  return balance;
}

export async function getSolBalance(
  rpc: Rpc<SolanaRpcApi>,
  account: Address,
): Promise<Decimal> {
  const balance = new Decimal(
    (await getSolBalanceInLamports(rpc, account)).toString(),
  );
  return lamportsToCollDecimal(balance, 9);
}

export type Cluster = "localnet" | "devnet" | "mainnet";

export async function accountExist(rpc: Rpc<SolanaRpcApi>, account: Address) {
  const info = await rpc.getAccountInfo(account).send();
  return !(info === null || info.value?.data.length === 0);
}

export async function getClaimStatusPDA(
  claimant: Address,
  distributor: Address,
  programId: Address,
): Promise<Address> {
  const addressEncoder = getAddressEncoder();
  const [userState, _userStateBump] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      "ClaimStatus",
      addressEncoder.encode(claimant),
      addressEncoder.encode(distributor),
    ],
  });

  return userState;
}

export async function initializeClient(): Promise<{
  initialOwner: KeyPairSigner;
  rpc: Rpc<SolanaRpcApi>;
  rpcWs: RpcSubscriptions<SolanaRpcSubscriptionsApi>;
}> {
  const admin = process.env.ADMIN;
  const rpc = process.env.RPC;
  const rpcSubscriptions = process.env.RPC_WS;
  let resolvedRpc: string;
  let resolvedRpcSubscriptions: string;
  let resolvedAdmin: string;

  if (rpc) {
    resolvedRpc = rpc;
  } else {
    throw "Must specify cluster";
  }

  if (rpcSubscriptions) {
    resolvedRpcSubscriptions = rpcSubscriptions;
  } else {
    throw "Must specify websocket cluster";
  }

  if (admin) {
    resolvedAdmin = admin;
  } else {
    throw "Must specify admin";
  }

  const payer = await parseKeypairFile(admin);

  const initialOwner = payer;
  const connection = createSolanaRpc(rpc);
  const wsConnection = createSolanaRpcSubscriptions(rpcSubscriptions);

  console.log("\nSettings ⚙️");
  console.log("Admin:", resolvedAdmin);
  console.log("Cluster:", resolvedRpc);
  console.log("Cluster WS:", resolvedRpcSubscriptions);

  return {
    initialOwner,
    rpc: connection,
    rpcWs: wsConnection,
  };
}

export async function printSimulateTx(rpc: Rpc<SolanaRpcApi>, tx: Transaction) {
  console.log(
    "Tx in B64",
    `https://explorer.solana.com/tx/inspector?message=${encodeURIComponent(
      Buffer.from(tx.messageBytes).toString("base64"),
    )}`,
  );

  let res = await rpc
    .simulateTransaction(getBase64EncodedWireTransaction(tx), {
      encoding: "base64",
    })
    .send();
  console.log("Simulate Response", res);
  console.log("");
}

export function createAddExtraComputeUnitFeeTransaction(
  units: number,
  microLamports: number,
): Instruction[] {
  const ixns: Instruction[] = [];
  ixns.push(
    fromLegacyTransactionInstruction(
      ComputeBudgetProgram.setComputeUnitLimit({ units }),
    ),
  );
  ixns.push(
    fromLegacyTransactionInstruction(
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports }),
    ),
  );
  return ixns;
}

export async function fetchUserDataFromApi(
  user: Address,
  apiUrl: string,
): Promise<ClaimApiResponse> {
  const headers: Headers = new Headers();
  // Add a few headers
  headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");
  // Add a custom header, which we can use to check
  headers.set("X-Custom-Header", "CustomValue");

  // Create the request object, which will be a RequestInfo type.
  // Here, we will pass in the URL as well as the options object as parameters.
  const request: RequestInfo = new Request(
    apiUrl + "/distributor/user/" + user.toString(),
    {
      method: "GET",
      headers: headers,
    },
  );

  return (
    fetch(request)
      // the JSON body is taken from the response
      .then(async (res) => {
        return res.json();
      })
      .then((res) => {
        // The response has an `any` type, so we need to cast
        // it to the `User` type, and return it from the promise
        return res as ClaimApiResponse;
      })
  );
}

export type ClaimApiResponse = {
  merkle_tree: string;
  amount: number;
  proof: Array<Array<number>>;
};

export function readCsv(path: string, decimalsInCsv: string) {
  const headers = ["pubkey", "amount"];
  const fileContent = fs.readFileSync(path, { encoding: "utf-8" });
  const userClaims: UserClaim[] = [];
  const csvLines = fileContent.split("\n");
  for (let lineIndex = 1; lineIndex < csvLines.length; lineIndex++) {
    const line = csvLines[lineIndex];
    const values = line.split(",");
    if (values[0] && values[1]) {
      userClaims.push({
        address: address(values[0]),
        amount: new Decimal(Number(values[1]) * 10 ** Number(decimalsInCsv))
          .floor()
          .toNumber(),
      });
    }
  }

  return userClaims;
}

export type UserClaim = {
  address: Address;
  amount: number;
};

export function readMerkleTreesDirectory(
  path: string,
): Map<string, ApiFormatData> {
  const apiFormatDataMap = new Map<string, ApiFormatData>();

  fs.readdirSync(path, { withFileTypes: true }).forEach((file) => {
    if (file.isDirectory()) {
      throw new Error("Wrong directory structure");
    } else {
      const farmConfigFromFile: MerkleTreeJsonFile = JSON.parse(
        fs.readFileSync(file.path + "/" + file.name, "utf8"),
      );

      farmConfigFromFile.tree_nodes.forEach((claimant) => {
        const claimantAddress = fromLegacyPublicKey(
          new PublicKey(claimant.claimant),
        );
        const amount = claimant.amount;
        const proof = claimant.proof;

        apiFormatDataMap.set(claimantAddress.toString(), {
          amount,
          proof,
        });
      });
    }
  });

  return apiFormatDataMap;
}

type MerkleTreeJsonFile = {
  merkle_root: Array<number>;
  airdrop_version: number;
  max_num_nodes: number;
  max_total_claim: number;
  tree_nodes: Array<ClaimantJson>;
};

type ClaimantJson = {
  claimant: Array<number>;
  amount: number;
  proof: Array<Array<number>>;
};

export type ApiFormatData = {
  amount: number;
  proof: Array<Array<number>>;
};

export async function retryAsync(
  fn: () => Promise<any>,
  retriesLeft = 5,
  interval = 2000,
): Promise<any> {
  try {
    return await fn();
  } catch (error) {
    if (retriesLeft) {
      await new Promise((resolve) => setTimeout(resolve, interval));
      return await retryAsync(fn, retriesLeft - 1, interval);
    }
    throw error;
  }
}

export function noopProfiledFunctionExecution(
  promise: Promise<any>,
): Promise<any> {
  return promise;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
