import React, { useCallback, useEffect, useState } from "react";
import main from "./images/main.png";
import "./App.css";
import { type PublicKeyCredentialDescriptorJSON } from "@github/webauthn-json";
import { getRegistrations, saveRegistration, setRegistrations } from "./state";
import { useWeb3Modal } from "@web3modal/react";
import {
  useContractRead,
  useBalance,
  useAccount,
  useContractWrite,
  usePrepareContractWrite,
} from "wagmi";
import { Client } from "@xmtp/xmtp-js";
import {
  parseCreationOptionsFromJSON,
  create,
  get,
  parseRequestOptionsFromJSON,
} from "@github/webauthn-json/browser-ponyfill";
import { ascii_to_hexa, derToRS, parseAuthData } from "./utils";
import { ethers } from "ethers";
import txauthenticator_abi from "./abi";
import { useEthersSigner } from "./ethers";
const base64url = require("base64url");
const cbor = require("cbor");

// useless PK address is 0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199
const PK = "df57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e";
// const PK = process.env.ROBOT_PRIVATE_KEY;
const Pkey = `0x${PK}`;
const _signer = new ethers.Wallet(Pkey);

export function Pages() {
  const { open, close } = useWeb3Modal();

  const [txLimit, setTxLimit] = useState(0);
  const [isDeploying, setIsDeploying] = useState(false);
  const [publicKey, setPublicKey] = useState("");
  const [contractAddress, setContractAddress] = useState("");
  const { connector: activeConnector, isConnected, address } = useAccount();

  const initXMTP = useCallback(async () => {
    await xmtp();
  }, []);

  useEffect(() => {
    initXMTP();
  }, [initXMTP]);

  useEffect(() => {
    if (localStorage.getItem("contractAddress") && contractAddress === "") {
      setContractAddress(localStorage.getItem("contractAddress"));
    }
  }, []);

  console.log(address);

  const confirmAndDeploy = async () => {
    setIsDeploying(true);
    const xmtp = await Client.create(_signer, { env: "dev" });
    // Start a conversation with XMTP
    const conversation = await xmtp.conversations.newConversation(
      "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    );

    let info = {
      amount: txLimit,
      publicKey: publicKey,
      owner: address,
    };

    await conversation.send("deploy " + JSON.stringify(info));
    console.log("sent");
    setIsDeploying(false);
  };
  // clear();

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
    // console.log(messages);
    // Send a message
    // await conversation.send("gm from frontend");
    // Listen for new messages in the conversation
    for await (const message of await conversation.streamMessages()) {
      console.log(`[${message.senderAddress}]: ${message.content}`);
      if (message.content.includes("Deployed to:")) {
        let address = message.content.split("Deployed to: ")[1];
        setContractAddress(address);
        await localStorage.setItem("contractAddress", address);
      }
    }
  };

  let toRender = <HomePage open={open} />;
  if (isConnected && !contractAddress) {
    toRender = (
      <Setup
        xmtp={xmtp}
        txLimit={txLimit}
        setTxLimit={setTxLimit}
        publicKey={publicKey}
        setPublicKey={setPublicKey}
        confirmAndDeploy={confirmAndDeploy}
        isDeploying={isDeploying}
      />
    );
  } else if (isConnected && contractAddress) {
    toRender = (
      <WalletPage contractAddress={contractAddress} address={address} />
    );
  }

  return <div>{toRender}</div>;
}

const HomePage = ({ open }) => {
  return (
    <header className="App-header">
      <img src={main} />
      <p>Secure your Ethereum Wallet with 2FA</p>
      <div style={{ fontSize: "12px" }}>
        Safeguard your assets by setting a daily transaction limit and using a
        YubiKey for authorizing higher-value transactions
      </div>
      <button className="btn btn-primary" onClick={() => open()}>
        Connect Wallet
      </button>
    </header>
  );
};

const Setup = ({
  xmtp,
  txLimit,
  setTxLimit,
  publicKey,
  setPublicKey,
  confirmAndDeploy,
  isDeploying,
}) => {
  return (
    <div>
      {/* {address} */}
      <button onClick={async () => xmtp()}>XMTP CLICK ME</button>

      <div>
        2FA not enabled. Set your daily transaction limit and pair your security
        key below.
      </div>
      <div className="flex">Wallet Settings</div>
      <div className="columns-2">
        <div>
          <div>Daily Transaction Limit</div>
          <div className="text-xs">
            Decide the maximum amount you can send daily without verification.
          </div>
        </div>
        <div>
          <input
            className="input"
            type="number"
            value={txLimit}
            onChange={(e) => setTxLimit(+e.target.value)}
            placeholder="Enter an amount"
          ></input>
        </div>
      </div>
      <div className="columns-2">
        <div>
          <div>Security Key</div>
          <div>
            <div className="text-xs">
              Decide the maximum amount you can send daily without verification.
            </div>
          </div>
        </div>
        {publicKey ? (
          <div>Paired!</div>
        ) : (
          <button
            className="btn btn-primary"
            onClick={async () => {
              try {
                let publicKey = await register();
                setPublicKey(publicKey);
                localStorage.setItem("publicKey", publicKey);
              } catch (e) {
                console.error(e);
              }
            }}
          >
            Pair your security key
          </button>
        )}
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
      <button
        className="btn btn-primary"
        onClick={async () => {
          await confirmAndDeploy();
        }}
        disabled={!(txLimit !== 0 && publicKey !== "") || isDeploying}
      >
        Confirm and Deploy
      </button>
    </div>
  );
};

const WalletPage = ({ contractAddress, address }) => {
  const signer = useEthersSigner();
  const {
    data: txLimit,
    isError,
    isLoading,
  } = useContractRead({
    address: contractAddress,
    abi: txauthenticator_abi,
    functionName: "getSpendLimitPerDay",
  });
  // console.log(data);
  const {
    data: myBalance,
    isError: isErrorBal1,
    isLoading: isLoadingBal1,
  } = useBalance({
    address: address,
  });
  const {
    data: contractBalance,
    isError: isErrorBal2,
    isLoading: isLoadingBal2,
  } = useBalance({
    address: contractAddress,
  });

  const {
    data: simpleTransferData,
    isLoading: isSimpleContractWriteLoading,
    isSuccess: isSimpleContractWriteSuccess,
    write: simpleTransferWrite,
  } = useContractWrite({
    address: contractAddress,
    abi: txauthenticator_abi,
    functionName: "simpleTransfer",
    gas: 400000,
  } as any);

  const [addressToSendTo, setAddressToSendTo] = useState("");
  const [amountToSend, setAmountToSend] = useState(0);
  const [needsVerification, setNeedsVerification] = useState(false);

  useEffect(() => {
    if (txLimit && +amountToSend >= +txLimit.toString()) {
      setNeedsVerification(true);
    } else {
      setNeedsVerification(false);
    }
  }, [amountToSend, txLimit]);

  const handleSend = async () => {
    if (needsVerification) {
      let res = await authenticate().catch(console.error);
      // let provider = ethers.getDefaultProvider("http://localhost:8545");
      const myContract = new ethers.Contract(
        contractAddress,
        txauthenticator_abi,
        signer
      );

      console.log(
        await myContract
          .authenticatedTransfer(
            addressToSendTo,
            amountToSend,
            Buffer.from(res.authenticator, "hex"),
            "0x01",
            Buffer.from(res.clientData, "hex"),
            Buffer.from(res.challenge, "hex"),
            // THIS WAS THE ERROR
            36,
            res.sig,
            { gasLimit: 600000 }
          )
          .catch(console.error)
      );

      // console.log(args);
      // // hard transfer
      // console.log(
      //   // @ts-ignore
      //   authenticatedTransfer({
      //     args: args,
      //   })
      // );

      // let tx = await txauthenticator.authenticatedTransfer(
      //   "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      //   "2000",
      //   authenticatorData,
      //   0x01,
      //   clientData,
      //   clientChallenge,
      //   challengeOffset,
      //   sig,
      //   { gasLimit: 4000000 }
      // );
    } else {
      // simpleTransfer
      console.log(
        // @ts-ignore
        simpleTransferWrite({ args: [addressToSendTo, amountToSend] } as any)
      );
    }
  };

  return (
    <div>
      <div className="flex space-x-1">
        <div>{address && address.substring(0, 5) + "..."}</div>
        <div>{myBalance ? myBalance.formatted + myBalance.symbol : ""}</div>
        <div>
          {contractBalance
            ? contractBalance.formatted + contractBalance.symbol
            : ""}
        </div>
        <div>
          <button className="btn btn-primary btn-outline">Deposit</button>
        </div>
        <div>
          <button
            className="btn btn-primary"
            onClick={() => (window as any).my_modal_1.showModal()}
          >
            Send
          </button>
        </div>
      </div>

      <div>2FA is enabled. </div>
      <div className="flex">Wallet Settings</div>
      <div className="columns-2">
        <div>
          <div>Contract Address</div>
        </div>
        <div>{contractAddress}</div>
      </div>
      <div className="columns-2">
        <div>
          <div>Daily Transaction Limit</div>
        </div>
        <div>{txLimit && txLimit.toString()}</div>
      </div>
      <div className="columns-2">
        <div>
          <div>Security Key</div>
        </div>
        <div>Yubikey NFC</div>
        <div className="text-xs">Added on: July 22, 2023</div>
      </div>

      <dialog id="my_modal_1" className="modal">
        <form method="dialog" className="modal-box">
          Transfer funds
          <div className="flex">Send to</div>
          <input
            className="input"
            value={addressToSendTo}
            onChange={(e) => setAddressToSendTo(e.target.value)}
            placeholder="Enter an address or ENS"
          ></input>
          <div className="flex">Amount</div>
          <div className="flex justify-center items-center">
            <input
              className="input"
              type="number"
              value={amountToSend}
              onChange={(e) => setAmountToSend(+e.target.value)}
              placeholder="Enter an amount"
            ></input>{" "}
            ETH
          </div>
          {needsVerification && (
            <div>
              This amount is greater than your daily limit. Security
              verification required.
            </div>
          )}
          <div className="flex items-center">
            <div className="modal-action">
              {/* if there is a button in form, it will close the modal */}
              <button className="btn">Cancel</button>
              <div
                className="btn btn-primary"
                onClick={async () => await handleSend().catch(console.error)}
              >
                Send
              </div>
            </div>
          </div>
        </form>
      </dialog>
    </div>
  );
};

export default Pages;

async function register(): Promise<string> {
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
  return keyxy;
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
}): Promise<any> {
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
  console.log("clientDataJSON", clientDataJSON);

  let signature = base64url.toBuffer(authJSON.response.signature);
  // let sig1 = base64url.toBuffer(authJSON.response.signature).toString("hex");
  console.log("signature", signature);
  // console.log("signature1", sig1);
  let authenticator = base64url
    .toBuffer(authJSON.response.authenticatorData)
    .toString("hex");
  console.log("authenticator", authenticator);
  let clientData = base64url
    .toBuffer(authJSON.response.clientDataJSON)
    .toString("hex");
  console.log("client_data", clientData);
  let challenge = base64url
    .toBuffer(clientDataJSON.challenge, "hex")
    .toString("hex");
  // let challenge = Buffer.from(clientDataJSON.challenge, "hex");
  console.log("challenge", challenge);

  // THIS IS A BUG HERE IT DOESNT DO IT OVER HEX
  const challengeOffset =
    clientData.indexOf("226368616c6c656e6765223a", 0) + 12 + 1;
  // clientData.indexOf("226368616c6c656e6765223a", 0, "hex") + 12 + 1;
  const signatureParsed = derToRS(signature);
  console.log(signatureParsed);
  const sig = [
    ethers.BigNumber.from("0x" + signatureParsed[0].toString("hex")),
    ethers.BigNumber.from("0x" + signatureParsed[1].toString("hex")),
  ];

  return {
    auth,
    signature,
    sig,
    challengeOffset,
    authenticator,
    clientData,
    challenge,
    flag: "0x01",
  };
}
async function clear(): Promise<void> {
  setRegistrations([]);
}
