const { ethers } = require("ethers");

require("@nomicfoundation/hardhat-toolbox");
require("hardhat-gas-reporter");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000000,
      },
    },
  },
  networks: {
    l2: {
      url: "https://replica0.goerli.optimism.alembic.tech/",
      accounts: [process.env.PRIVATE_KEY || ethers.constants.HashZero],
    },
    hardhat: {
      chainId: 1337, // We set 1337 to make interacting with MetaMask simpler
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
  },
};
