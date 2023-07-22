// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const { generateTable } = require("../src/generate_table");
const { bundleTable } = require("../src/bundle_table");
const { ec: EC } = require("elliptic");
const curve = new EC("p256");

async function main() {
  const auth = await deploy();

  console.log("webauth", auth.webauthn.address);
  // console.log(auth.pubKey);
  console.log("pub key contract", auth.pubKeyContract.address);
  console.log("txauth contract", auth.txauthenticator.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function deploy() {
  let publicKey = process.env.PUBLIC_KEY;
  let owner = process.env.OWNER;
  let amount = process.env.AMOUNT;

  if (!publicKey || !owner || !amount) {
    throw new Error("no owner or public key or amount!");
  }
  const pubKeyStr = Buffer.from(
    // "d8746a124200b059510062d57f750c39fb7a9ac4cfa6f4080092513efb653d164ddfad14d96d82879941959f4286e76a0e0ce93dbcf0ff54ac40c68018789862",
    publicKey,
    "hex"
  );

  const pubKey = curve.keyFromPublic({
    x: pubKeyStr.slice(0, 32),
    y: pubKeyStr.slice(32),
  });

  const gen = generateTable(curve.g, pubKey.getPublic(), 4);
  const { factory: BytecodeTable } = await bundleTable(gen.table);

  const [deployer] = await hre.ethers.getSigners();
  const table = await BytecodeTable.connect(deployer).deploy();

  const P256_mul = await hre.ethers.getContractFactory("P256_mul");
  const pubKeyContract = await P256_mul.deploy(table.address);

  const OptimizedCurve = await hre.ethers.getContractFactory("OptimizedCurve");
  const optimizedCurve = await OptimizedCurve.deploy();

  const Webauthn = await hre.ethers.getContractFactory("Webauthn", {
    libraries: { OptimizedCurve: optimizedCurve.address },
  });
  const webauthn = await Webauthn.deploy();

  const TxAuthenticator = await hre.ethers.getContractFactory(
    "TxAuthenticator",
    {
      libraries: { OptimizedCurve: optimizedCurve.address },
    }
  );
  const txauthenticator = await TxAuthenticator.deploy(
    pubKeyContract.address,
    amount,
    owner
    // "0x91da5bf3f8eb72724e6f50ec6c3d199c6355c59c"
  );

  return { webauthn, pubKey, pubKeyContract, txauthenticator };
}
