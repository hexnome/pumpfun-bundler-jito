import {
  VersionedTransaction,
  Keypair,
  SystemProgram,
  Transaction,
  Connection,
  ComputeBudgetProgram,
  TransactionInstruction,
  TransactionMessage,
  AddressLookupTableProgram,
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { AnchorProvider } from "@coral-xyz/anchor";
import { openAsBlob } from "fs";
import base58 from "bs58";

import {
  delay_1,
  delay_2,
  DESCRIPTION,
  DISTRIBUTION_WALLETNUM,
  FILE,
  global_mint,
  JITO_FEE,
  JITO_KEY,
  JitoType,
  PRIVATE_KEY,
  PUMP_PROGRAM,
  RPC_ENDPOINT,
  RPC_WEBSOCKET_ENDPOINT,
  SWAP_AMOUNT,
  TELEGRAM,
  TOKEN_CREATE_ON,
  TOKEN_NAME,
  TOKEN_SHOW_NAME,
  TOKEN_SYMBOL,
  TWITTER,
  wallet_1,
  wallets,
  WEBSITE,
} from "./constants";
import { saveDataToFile, sleep } from "./utils";
import { createAndSendV0Tx, execute } from "./executor/legacy";
import { PumpFunSDK } from "./src/pumpfun";
import { executeJitoTx } from "./executor/jito";
import { token } from "@coral-xyz/anchor/dist/cjs/utils";
import axios from "axios";

const commitment = "confirmed";

const connection = new Connection(RPC_ENDPOINT, {
  wsEndpoint: RPC_WEBSOCKET_ENDPOINT,
  commitment,
});
const mainKp = Keypair.fromSecretKey(base58.decode(PRIVATE_KEY));

let kps: JitoType[] = [];
const transactions: VersionedTransaction[] = [];

const mintKp = Keypair.generate();
//         |||||||||||||||||||
const mintAddress = mintKp.publicKey;

let sdk = new PumpFunSDK(
  new AnchorProvider(connection, new NodeWallet(new Keypair()), { commitment })
);

const main = async () => {
  const tokenCreationIxs = await createTokenTx();

  for (let i = 0; i < DISTRIBUTION_WALLETNUM; i++) {
    // wallets
  }

  // Create LUT
  const lutAddress = await createLUT();
  if (!lutAddress) {
    console.log("Lut creation failed");
    return;
  }
  console.log("LUT Address:", lutAddress.toBase58())
  await addAddressesToTable(lutAddress, mintAddress, kps);

  const buyIxs: TransactionInstruction[] = [];

  for (let i = 0; i < DISTRIBUTION_WALLETNUM; i++) {
    // console.log("buyIx--> ", ix)
  }

  const lookupTable = (await connection.getAddressLookupTable(lutAddress))
    .value;
  if (!lookupTable) {
    console.log("Lookup table not ready");
    return;
  }
  const latestBlockhashBuy = await connection.getLatestBlockhash();
  const mainWalletBuyIx = await makeBuyIx("");
  tokenCreationIxs.push(...mainWalletBuyIx);
  const tokenCreationTx = new VersionedTransaction();

  tokenCreationTx.sign([mainKp, mintKp]);
  console.log(await connection.simulateTransaction(tokenCreationTx))

  transactions.push(tokenCreationTx);
  for (let i = 0; i < Math.ceil(DISTRIBUTION_WALLETNUM / 5); i++) {
    const latestBlockhash = await connection.getLatestBlockhash();
    const instructions: TransactionInstruction[] = [];

    for (let j = 0; j < 5; j++) {
      const index = i * 5 + j;
      if (kps[index])
        // instrauctions
    }
    const msg = new TransactionMessage({
      payerKey: kps[i * 5].publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions,
    }).compileToV0Message([lookupTable]);

    const tx = new VersionedTransaction(msg);
    // tx.sign([mainKp])
  }
  const buyResult = await executeJitoTx(transactions, mainKp);
  console.log("buy successfully!", buyResult);

  // Sell main Wallet after delay_1 time
  await sleep(parseInt(delay_1));
  const mainWallet = mainKp;
  const ataTokenAddr = await getAssociatedTokenAddress(
    mintAddress,
    mainWallet.publicKey
  );
  const balance = await connection.getTokenAccountBalance(ataTokenAddr);
  const sellMainIx = await sdk.getSellInstructionsByTokenAmount(
    mainWallet.publicKey,
    mintAddress,
    BigInt(balance.value.amount)
  );
  const mainSellTx = new Transaction();
  const cpIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: 1_000_000,
  });
  const cuIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 });
  mainSellTx.add(cpIx, cuIx, sellMainIx);
  mainSellTx.feePayer = mainWallet.publicKey;
  const blockhash = await connection.getLatestBlockhash();
  mainSellTx.recentBlockhash = blockhash.blockhash;
  mainSellTx.sign(mainWallet);

  const sig = await sendAndConfirmTransaction(
    connection,
    mainSellTx,
    [mainWallet],
    { skipPreflight: true }
  );
  console.log(`Sold token from main Wallet : https://solscan.io/tx/${sig}`);

  // Bundle of sell transactions
  
  console.log("jito tx result: ", result);
};