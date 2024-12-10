import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
  Transaction,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import { Decimal } from "decimal.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress as getAta,
  createAssociatedTokenAccountInstruction
} from "@solana/spl-token";
import DISTRIBUTORIDL from "./rpc_client/merkle_distributor.json";
import * as fs from "fs";

export const DISTRIBUTOR_IDL = DISTRIBUTORIDL as anchor.Idl;
export const WAD = new Decimal("1".concat(Array(18 + 1).join("0")));

export function parseKeypairFile(file: string): Keypair {
  return Keypair.fromSecretKey(
    Buffer.from(JSON.parse(require("fs").readFileSync(file))),
  );
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
  owner: PublicKey,
  tokenMintAddress: PublicKey,
): Promise<PublicKey> {
  return await getAta(
    tokenMintAddress, // mint
    owner, // owner
    true,
    TOKEN_PROGRAM_ID, // always TOKEN_PROGRAM_ID
  );
}

export async function createAtaInstruction(
  owner: PublicKey,
  tokenMintAddress: PublicKey,
  ata: PublicKey,
): Promise<TransactionInstruction> {
  return createAssociatedTokenAccountInstruction(
    owner, // fee payer
    ata, // ata
    owner, // owner of token account
    tokenMintAddress, // mint
    TOKEN_PROGRAM_ID, // always TOKEN_PROGRAM_ID
  );
}

export async function getTokenAccountBalance(
  provider: anchor.AnchorProvider,
  tokenAccount: PublicKey,
): Promise<Decimal> {
  const tokenAccountBalance =
    await provider.connection.getTokenAccountBalance(tokenAccount);
  return new Decimal(tokenAccountBalance.value.amount).div(
    Decimal.pow(10, tokenAccountBalance.value.decimals),
  );
}

export async function getSolBalanceInLamports(
  provider: anchor.AnchorProvider,
  account: PublicKey,
): Promise<number> {
  let balance: number | undefined = undefined;
  while (balance === undefined) {
    balance = (await provider.connection.getAccountInfo(account))?.lamports;
  }
  return balance;
}

export async function getSolBalance(
  provider: anchor.AnchorProvider,
  account: PublicKey,
): Promise<Decimal> {
  const balance = new Decimal(await getSolBalanceInLamports(provider, account));
  return lamportsToCollDecimal(balance, 9);
}

export type Cluster = "localnet" | "devnet" | "mainnet";

export async function accountExist(
  connection: anchor.web3.Connection,
  account: anchor.web3.PublicKey,
) {
  const info = await connection.getAccountInfo(account);
  if (info === null || info.data.length === 0) {
    return false;
  }
  return true;
}

export function getClaimStatusPDA(
  claimant: PublicKey,
  distributor: PublicKey,
  programId: PublicKey,
): PublicKey {
  const [userState, _userStateBump] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("ClaimStatus"), claimant.toBuffer(), distributor.toBuffer()],
      programId,
    );

  return userState;
}

export function initializeClient(): {
  initialOwner: Keypair;
  provider: anchor.AnchorProvider;
} {
  const admin = process.env.ADMIN;
  const rpc = process.env.RPC;
  let resolvedRpc: string;
  let resolvedAdmin: string;

  console.log(admin, rpc);

  if (rpc) {
    resolvedRpc = rpc;
  } else {
    throw "Must specify cluster";
  }

  if (admin) {
    resolvedAdmin = admin;
  } else {
    throw "Must specify admin";
  }

  const payer = parseKeypairFile(admin);
  const connection = new Connection(resolvedRpc, {
    commitment: "confirmed",
  });
  // @ts-ignore
  const wallet = new anchor.Wallet(payer);
  const provider = new anchor.AnchorProvider(
    connection,
    wallet,
    anchor.AnchorProvider.defaultOptions(),
  );
  const initialOwner = payer;
  anchor.setProvider(provider);

  console.log("\nSettings ⚙️");
  console.log("Admin:", resolvedAdmin);
  console.log("Cluster:", resolvedRpc);

  return {
    initialOwner,
    provider,
  };
}

export async function printSimulateTx(conn: Connection, tx: Transaction) {
  console.log(
    "Tx in B64",
    `https://explorer.solana.com/tx/inspector?message=${encodeURIComponent(
      tx.serializeMessage().toString("base64"),
    )}`,
  );

  let res = await conn.simulateTransaction(tx);
  console.log("Simulate Response", res);
  console.log("");
}

export function createAddExtraComputeUnitFeeTransaction(
  units: number,
  microLamports: number,
): TransactionInstruction[] {
  const ixns: TransactionInstruction[] = [];
  ixns.push(ComputeBudgetProgram.setComputeUnitLimit({ units }));
  ixns.push(ComputeBudgetProgram.setComputeUnitPrice({ microLamports }));
  return ixns;
}

export async function fetchUserDataFromApi(
  user: PublicKey,
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
        address: new PublicKey(values[0]),
        amount: new Decimal(Number(values[1]) * 10 ** Number(decimalsInCsv))
          .floor()
          .toNumber(),
      });
    }
  }

  return userClaims;
}

export type UserClaim = {
  address: PublicKey;
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
        const claimantAddress = new PublicKey(claimant.claimant);
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
