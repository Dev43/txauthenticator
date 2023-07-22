import { createSocketConnection, EVENTS } from "@pushprotocol/socket";
import * as PushAPI from "@pushprotocol/restapi";
import "dotenv/config";
import { exec, spawn } from "child_process";
import { promises } from "node:fs";

const PK = process.env.PRIVATE_KEY;

// deploy the contracts
// save the address

// interact with the contract through the frontend + send the correct info
// see if it works
const start = async () => {
  await deploy();
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
        PUBLIC_KEY:
          "d8746a124200b059510062d57f750c39fb7a9ac4cfa6f4080092513efb653d164ddfad14d96d82879941959f4286e76a0e0ce93dbcf0ff54ac40c68018789862",
        OWNER: "0x91da5bf3f8eb72724e6f50ec6c3d199c6355c59c",
        AMOUNT: 1,
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
