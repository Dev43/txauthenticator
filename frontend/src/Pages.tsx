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
import {
  configureChains,
  createConfig,
  useSignMessage,
  WagmiConfig,
} from "wagmi";
import { arbitrum, mainnet, polygon } from "wagmi/chains";
import { Web3Button } from "@web3modal/react";
import { useAccount } from "wagmi";
import { Client } from "@xmtp/xmtp-js";
import { Wallet } from "ethers";
import {
  parseCreationOptionsFromJSON,
  create,
  get,
  parseRequestOptionsFromJSON,
  supported,
  AuthenticationPublicKeyCredential,
} from "@github/webauthn-json/browser-ponyfill";
import { ascii_to_hexa, parseAuthData } from "./utils";
import { ethers } from "ethers";
const base64url = require("base64url");
const cbor = require("cbor");

// useless PK address is 0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199
const PK = "df57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e";
// const PK = process.env.ROBOT_PRIVATE_KEY;
const Pkey = `0x${PK}`;
const _signer = new ethers.Wallet(Pkey);

export function Pages() {
  const { open, close } = useWeb3Modal();
  const [step, setStep] = useState(0);
  const [canDeploy, setCanDeploy] = useState(false);
  const { connector: activeConnector, isConnected, address } = useAccount();

  console.log(address);
  console.log(activeConnector);

  const xmtp = async () => {
    // You'll want to replace this with a wallet from your application
    // Create the client with your wallet. This will connect to the XMTP development network by default
    const xmtp = await Client.create(_signer, { env: "dev" });
    // Start a conversation with XMTP
    const conversation = await xmtp.conversations.newConversation(
      "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    );
    // Load all messages in the conversation
    const messages = await conversation.messages();
    console.log(messages);
    // Send a message
    await conversation.send("gm from frontend");
    // Listen for new messages in the conversation
    for await (const message of await conversation.streamMessages()) {
      console.log(message);
      console.log(`[${message.senderAddress}]: ${message.content}`);
    }
  };

  return (
    <div>
      {!isConnected ? (
        <header className="App-header">
          <img src={main} />
          <p>Secure your Ethereum Wallet with 2FA</p>
          <div style={{ fontSize: "12px" }}>
            Safeguard your assets by setting a daily transaction limit and using
            a YubiKey for authorizing higher-value transactions
          </div>
          <button onClick={() => open()}>Connect Wallet</button>
          <button onClick={async () => await register().catch(console.error)}>
            Register
          </button>
          <button
            onClick={async () => await authenticate().catch(console.error)}
          >
            Authenticate
          </button>
        </header>
      ) : (
        <div>
          {/* {address} */}
          <button onClick={async () => xmtp()}>XMTP CLICK ME</button>

          <div>
            2FA not enabled. Set your daily transaction limit and pair your
            security key below.
          </div>
          <div className="flex">Wallet Settings</div>
          <div className="columns-2">
            <div>
              <div>Daily Transaction Limit</div>
              <div className="text-xs">
                Decide the maximum amount you can send daily without
                verification.
              </div>
            </div>
            <div>
              <input className="input" placeholder="Enter an amount"></input>
            </div>
          </div>
          <div className="columns-2">
            <div>
              <div>Security Key</div>
              <div>
                <div className="text-xs">
                  Decide the maximum amount you can send daily without
                  verification.
                </div>
              </div>
            </div>
            <button
              className="btn btn-primary"
              onClick={async () => await register().catch(console.error)}
            >
              Pair your security key
            </button>
          </div>
          {/* <div className="columns-2">
            <div>
              <div>Deposit Amount</div>
              <div className="text-xs" style={{ fontSize: "10px" }}>
                Enter an amount of Ether to be deposited to your TxAuthenticator
                vault. Only this amount will be protected by your security key.
                You can withdraw or deposit more after setup.
              </div>
            </div>
            <input className="input" placeholder="Enter an amount"></input>
          </div> */}
          <button className="btn btn-primary" disabled={!canDeploy}>
            Confirm and Deploy
          </button>
        </div>
      )}
    </div>
  );
}

export default Pages;

async function register(): Promise<void> {
  const cco = parseCreationOptionsFromJSON({
    publicKey: {
      challenge: "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
      rp: { name: "txauthenticator" },
      user: {
        id: "IIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII",
        name: "test_user",
        displayName: "Test User",
      },
      pubKeyCredParams: [
        {
          type: "public-key",
          alg: -7, // "ES256" as registered in the IANA COSE Algorithms registry
        },
      ],
      excludeCredentials: registeredCredentials(),
      authenticatorSelection: { userVerification: "discouraged" },
      extensions: {
        credProps: true,
      },
    },
  });
  let res = await create(cco);
  // var cred = await navigator.credentials.create(cco);
  // console.log(cred);
  // let a = await (cred as any).response.getPublicKey();
  // console.log((cred as any).response.getPublicKeyAlgorithm());
  // console.log(a);
  // console.log("key", a.toString("hex"));
  console.log("registration");

  let resJSON = res.toJSON();
  console.log(resJSON);
  let attestationObjectBuffer = base64url.toBuffer(
    resJSON.response.attestationObject
  );
  let ctapMakeCredResp = cbor.decodeAllSync(attestationObjectBuffer)[0];
  console.log(ctapMakeCredResp);
  console.log(ctapMakeCredResp);
  let parsed = parseAuthData(ctapMakeCredResp.authData);
  console.log(parsed);
  console.log(parsed.cosePublicKeyBuffer.toString("hex"));
  let decodedKeyElems = cbor.decodeAllSync(parsed.cosePublicKeyBuffer)[0];
  console.log(decodedKeyElems);
  let x = decodedKeyElems.get(-2);
  console.log(x);
  let y = decodedKeyElems.get(-3);
  let keyxy = Buffer.from(x).toString("hex") + Buffer.from(y).toString("hex");

  console.log("PUBLIC KEY", keyxy);

  // console.log(getXYCoordinates(parsed.cosePublicKeyBuffer));
  saveRegistration(res);
}

function registeredCredentials(): PublicKeyCredentialDescriptorJSON[] {
  return getRegistrations().map((reg) => ({
    id: reg.rawId,
    type: reg.type,
  }));
}

// ALL I NEED TO SAVE IS THE ID AND THE TYPE (+ public key to verify all of it)
async function authenticate(options?: {
  conditionalMediation?: boolean;
}): Promise<AuthenticationPublicKeyCredential> {
  const cro = parseRequestOptionsFromJSON({
    publicKey: {
      challenge: "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
      allowCredentials: registeredCredentials(),
      userVerification: "discouraged",
    },
  });
  console.log("authentication");
  let auth = await get(cro);
  let authJSON = auth.toJSON();
  console.log(authJSON);
  let clientDataJSON = JSON.parse(
    base64url.decode(authJSON.response.clientDataJSON)
  );
  console.log(clientDataJSON);

  console.log(
    "signature",
    base64url.toBuffer(authJSON.response.signature).toString("hex")
  );
  console.log(
    "authenticator",
    base64url.toBuffer(authJSON.response.authenticatorData).toString("hex")
  );
  console.log(
    "client_data",
    ascii_to_hexa(
      base64url.decode(authJSON.response.clientDataJSON).toString("hex")
    )
  );
  console.log(
    "challenge",
    base64url.toBuffer(clientDataJSON.challenge).toString("hex")
  );
  return auth;
}
async function clear(): Promise<void> {
  setRegistrations([]);
}
