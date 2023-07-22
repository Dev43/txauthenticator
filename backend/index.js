import { createSocketConnection, EVENTS } from "@pushprotocol/socket";
import * as PushAPI from "@pushprotocol/restapi";
import "dotenv/config";
import ethers from "ethers";
import { exec, spawn } from "child_process";
import { promises } from "node:fs";
import txauthenticator_abi from "./abi.js";

const PK = "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
// const PK = process.env.ROBOT_PRIVATE_KEY;
const Pkey = `0x${PK}`;
const _signer = new ethers.Wallet(Pkey);

const contractAddress = "0x36b58F5C1969B7b6591D752ea6F5486D069010AB";
const publicKey =
  "07886971cfd953bd4fe0f1ec9933c05892964738ac614998444447ec1184f9afed18f478816e921ef826168739f16849bea73bad056e06b2b6f6b3abd2b473e6";
const owner = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const amount = 1;

const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");

// const provider = new ethers.providers.InfuraProvider(
//   "goerli",
//   "cd9284d8201641c5a4cfe394661641e2"
// );

const wallet = new ethers.Wallet(PK, provider);

// interact with the contract through the frontend + send the correct info
// see if it works
const start = async () => {
  console.log(process.argv);
  if (process.argv.length > 2 && process.argv[2] === "deploy") {
    await deploy();
  } else {
    await transfer();
  }
};

const transfer = async () => {
  console.log("before", await provider.getBalance(contractAddress));
  const txauthenticator = new ethers.Contract(
    contractAddress,
    txauthenticator_abi,
    wallet
  );

  let spendLimit = await txauthenticator.getSpendLimitPerDay();
  console.log(spendLimit);

  let owner = await txauthenticator.owner();
  console.log(owner);

  const signature = Buffer.from(
    "3046022100deccf55c1d8ae24d84e86eb88ee5f21bb77e1da718e9ccb608d7b26bb528cddb022100cb4a0fdac5a67b0058787438f505b71aecae5cb32f1e57da78f17cbc6213bc7e",
    "hex"
  );
  const authenticatorData = Buffer.from(
    "49960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97630100000003",
    "hex"
  );
  const clientData = Buffer.from(
    "7b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a2243434343434343434343434343434343434343434343434343434343434343434343434343434343434341222c226f726967696e223a22687474703a2f2f6c6f63616c686f73743a33303030222c2263726f73734f726967696e223a66616c73657d",
    "hex"
  );
  const clientChallenge = Buffer.from(
    "0820820820820820820820820820820820820820820820820820820820820820",
    "hex"
  );

  const challengeOffset =
    clientData.indexOf("226368616c6c656e6765223a", 0, "hex") + 12 + 1;
  const signatureParsed = derToRS(signature);

  const sig = [
    ethers.BigNumber.from("0x" + signatureParsed[0].toString("hex")),
    ethers.BigNumber.from("0x" + signatureParsed[1].toString("hex")),
  ];

  let tx = await txauthenticator.authenticatedTransfer(
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    "2000",
    authenticatorData,
    0x01,
    clientData,
    clientChallenge,
    challengeOffset,
    sig,
    { gasLimit: 4000000 }
  );
  // let tx = await txauthenticator.simpleTransfer(
  //   "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  //   "1",
  //   { gasLimit: 400000 }
  // );
  console.log(tx);
  console.log("after", await provider.getBalance(contractAddress));

  // get the abi
  // get the private key and make an ethers
  // call authenticatedTransfer with the yubikey auth
  // change the PK
};

const deploy = async () => {
  const command = spawn(
    "npx",
    [
      "hardhat",
      "run",
      "--network",
      "localhost",
      "scripts/authenticator_deploy.js",
    ],
    {
      cwd: "../txauth",
      env: {
        ...process.env,
        PUBLIC_KEY: publicKey,
        OWNER: owner,
        AMOUNT: amount,
      },
    }
  );
  command.stdout.on("data", async (chunk) => {
    let data = chunk.toString().trim();
    console.log("Deploy:", data);
  });

  command.stderr.on("data", (data) => {
    console.error(`deploy stderr: ${data}`);
  });

  command.on("close", (code) => {
    console.log(`deploy process exited with code ${code}`);
  });
};
start().catch(console.error);

function derToRS(der) {
  var offset = 3;
  var dataOffset;

  if (der[offset] == 0x21) {
    dataOffset = offset + 2;
  } else {
    dataOffset = offset + 1;
  }
  const r = der.slice(dataOffset, dataOffset + 32);
  offset = offset + der[offset] + 1 + 1;
  if (der[offset] == 0x21) {
    dataOffset = offset + 2;
  } else {
    dataOffset = offset + 1;
  }
  const s = der.slice(dataOffset, dataOffset + 32);
  return [r, s];
}
