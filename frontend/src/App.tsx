import React, { useEffect, useState } from "react";
import main from "./images/main.png";
import "./App.css";
import { type PublicKeyCredentialDescriptorJSON } from "@github/webauthn-json";
import { getRegistrations, saveRegistration, setRegistrations } from "./state";
import {
  EthereumClient,
  w3mConnectors,
  w3mProvider,
} from "@web3modal/ethereum";
import { Web3Modal, useWeb3Modal } from "@web3modal/react";
import { configureChains, createConfig, WagmiConfig } from "wagmi";
import { arbitrum, mainnet, polygon } from "wagmi/chains";

import Pages from "./Pages";

const chains = [arbitrum, mainnet, polygon];
const projectId = "9399843b86859b8b4ceca09d035506dd";
const { publicClient } = configureChains(chains, [w3mProvider({ projectId })]);
const wagmiConfig = createConfig({
  autoConnect: true,
  connectors: w3mConnectors({ projectId, chains }),
  publicClient,
});
const ethereumClient = new EthereumClient(wagmiConfig, chains);

function App() {
  return (
    <div className="App">
      <WagmiConfig config={wagmiConfig}>
        <Pages />
      </WagmiConfig>
      <Web3Modal projectId={projectId} ethereumClient={ethereumClient} />
    </div>
  );
}

export default App;
