import React, { useCallback, useEffect, useState } from "react";
import main from "./images/main.png";
import shield from "./images/shield.png";
import greenShield from "./images/greenShield.png";
import goodShield from "./images/goodShield.png";
import yubikey from "./images/yubikey.png";
import nounCircle from "./images/nounCircle.png";
import nounShield from "./images/nounShield.png";
import wallet from "./images/wallet.png";
import header from "./images/header.png";
import yubikeyOrange from "./images/yubikeyOrange.png";
import "./App.css";
import { type PublicKeyCredentialDescriptorJSON } from "@github/webauthn-json";
import { getRegistrations, saveRegistration, setRegistrations } from "./state";
import { useWeb3Modal } from "@web3modal/react";
import { MetaMaskSDK } from "@metamask/sdk";

import {
  useContractRead,
  useBalance,
  useAccount,
  useContractWrite,
  usePrepareContractWrite,
  useSendTransaction,
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
import { parseEther } from "viem";
const base64url = require("base64url");
const cbor = require("cbor");

// ethereum.request({ method: "eth_requestAccounts", params: [] });
// useless PK address is 0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199
const PK = "df57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e";
// const PK = process.env.ROBOT_PRIVATE_KEY;
const Pkey = `0x${PK}`;
const _signer = new ethers.Wallet(Pkey);

const MMSDK = new MetaMaskSDK({
  dappMetadata: { name: "txauthenticator" },
  injectProvider: true,
  enableDebug: true,
  forceInjectProvider: true,
  shouldShimWeb3: true,
  forceRestartWalletConnect: true,
} as any);

export function Pages() {
  const { open, close } = useWeb3Modal();

  const [txLimit, setTxLimit] = useState(0);
  const [isDeploying, setIsDeploying] = useState(false);
  const [publicKey, setPublicKey] = useState("");
  const [contractAddress, setContractAddress] = useState("");
  const [mmAddress, setMMAddress] = useState("");
  const [isMMSDK, setIsMMSDK] = useState(false);
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
      owner: address || mmAddress,
    };

    await conversation.send("deploy " + JSON.stringify(info));
    console.log("sent");
    setIsDeploying(false);
  };
  // clear();

  const connectWithMetamask = async () => {
    const accounts = await (window as any).ethereum.request({
      method: "eth_requestAccounts",
      params: [],
    });
    console.log(accounts);
    // if MM we set the first address as signer
    setMMAddress(accounts[0]);

    setIsMMSDK(true);
  };

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

  let toRender = (
    <HomePage open={open} connectWithMetamask={connectWithMetamask} />
  );
  if ((address || mmAddress) && !contractAddress) {
    toRender = (
      <Setup
        txLimit={txLimit}
        setTxLimit={setTxLimit}
        publicKey={publicKey}
        setPublicKey={setPublicKey}
        confirmAndDeploy={confirmAndDeploy}
        isDeploying={isDeploying}
        address={address || mmAddress}
        isMMSDK={isMMSDK}
      />
    );
  } else if ((address || mmAddress) && contractAddress) {
    toRender = (
      <WalletPage
        contractAddress={contractAddress}
        address={address || mmAddress}
        isMMSDK={isMMSDK}
      />
    );
  }

  return (
    <div>
      <div className="flex border items-center mb-5 py-2 ">
        <img className="ml-2" width={200} height={10} src={header} />
        <div className="flex-grow"></div>
        {/* {isConnected ? (
          <div>hi</div>
        ) : (
          <button className="btn btn-primary btn-sm mr-2 text-[#FFFFFF]">
            Connect
          </button>
        )} */}
      </div>
      {toRender}
    </div>
  );
}

const HomePage = ({ open, connectWithMetamask }) => {
  return (
    <header className="App-header">
      <img className="p-5" src={main} />
      <p>
        <b>Secure your Ethereum Wallet with 2FA</b>
      </p>
      <div style={{ fontSize: "10px" }}>
        Safeguard your assets by setting a daily transaction limit and using a
        YubiKey for authorizing higher-value transactions
      </div>
      <button
        className="btn btn-primary text-[#FFFFFF] btn-md my-4"
        onClick={() => open()}
      >
        Connect with WalletConnect
      </button>
      <button
        className="btn bg-[#ea7a3d] text-[#FFFFFF] btn-md my-4"
        onClick={async () => await connectWithMetamask()}
      >
        Connect with Metamask SDK
      </button>
    </header>
  );
};

const Setup = ({
  txLimit,
  setTxLimit,
  publicKey,
  setPublicKey,
  confirmAndDeploy,
  isDeploying,
  address,
  isMMSDK,
}) => {
  const {
    data: myBalance,
    isError: isErrorBal1,
    isLoading: isLoadingBal1,
  } = useBalance({
    address: address,
  });
  return (
    <div className="p-10">
      {/* {address} */}

      <div className="flex border rounded-md p-4 text-[#9A9A9A] my-2 space-x-2 items-center">
        <img height={"49px"} width={"49px"} src={nounCircle} />
        <div>
          {address &&
            address.substring(0, 5) +
              "..." +
              address.substring(address.length - 4, address.length - 1)}
        </div>
        {/* <img height={"100px"} width={"100px"} src={nounShield} />
        <div>0</div> */}
        {!isMMSDK && (
          <div className="flex items-center space-x-1">
            <img height={"40px"} width={"40px"} src={wallet} />
            <div>{myBalance ? myBalance.formatted + myBalance.symbol : ""}</div>
          </div>
        )}
      </div>
      <div className="flex border rounded-md p-4 text-[#9A9A9A] my-2">
        <img className="mr-4" src={shield} />
        2FA not enabled. Set your daily transaction limit and pair your security
        key below.
      </div>
      <div className="flex flex-col border rounded-md p-4  my-2">
        <div className="bold flex mb-6">
          <b>Wallet Settings</b>
        </div>
        <div className="flex items-center ">
          <div className="mb-8">
            <div>Daily Transaction Limit</div>
            <div className="text-xs align-right" style={{ fontSize: "10px" }}>
              Decide the maximum amount you can send daily without verification.
            </div>
          </div>
          <div className="flex-grow"></div>
          <div>
            <input
              className="input input-bordered mr-2"
              type="number"
              value={txLimit}
              onChange={(e) => setTxLimit(+e.target.value)}
              placeholder="Enter an amount"
            ></input>
            WEI
          </div>
        </div>
        <div className="flex">
          <div className="mb-8">
            <div>Security Key</div>
            <div>
              <div className="" style={{ fontSize: "10px" }}>
                Decide the maximum amount you can send daily without
                verification.
              </div>
            </div>
          </div>
          <div className="flex-grow"></div>
          {publicKey ? (
            <div className="flex items-center">
              <img height={"40px"} width={"40px"} src={yubikey} />
              <div className="flex flex-col">
                <div>Yubikey NFC</div>
                <div style={{ fontSize: "10px" }}>Added July 23rd</div>
              </div>
            </div>
          ) : (
            <button
              className="btn btn-primary text-white rounded-md"
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
          className="btn btn-primary text-white rounded-md"
          onClick={async () => {
            await confirmAndDeploy();
          }}
          disabled={!(txLimit !== 0 && publicKey !== "") || isDeploying}
        >
          Confirm and Deploy
        </button>
      </div>
    </div>
  );
};

const WalletPage = ({ contractAddress, address, isMMSDK }) => {
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
  const { data, sendTransaction } = useSendTransaction();

  useEffect(() => {
    if (txLimit && +amountToSend >= +txLimit.toString()) {
      setNeedsVerification(true);
    } else {
      setNeedsVerification(false);
    }
  }, [amountToSend, txLimit]);

  const initData = useCallback(async () => {
    await getData();
  }, []);

  useEffect(() => {
    initData();
  }, [initData]);

  const getData = async () => {
    if (isMMSDK) {
      // we get spend limit
      // we get contract and user balance
      const ethereum = MMSDK.getProvider();

      const provider = new ethers.providers.Web3Provider(ethereum as any);
      let contractBalance = await provider.getBalance(contractAddress);
      let userBalance = await provider.getBalance(address);

      const myContract = new ethers.Contract(
        contractAddress,
        txauthenticator_abi,
        provider
      );
      let txLimit = await myContract.getSpendLimitPerDay();
      console.log(
        contractBalance
          .div(ethers.BigNumber.from("1000000000000000000"))
          .toString(),
        userBalance
          .div(ethers.BigNumber.from("1000000000000000000"))
          .toString(),
        txLimit.toNumber()
      );
    }
  };

  const handleDeposit = async () => {
    console.log(isMMSDK);
    if (isMMSDK) {
      const ethereum = MMSDK.getProvider();

      const provider = new ethers.providers.Web3Provider(ethereum as any);
      const signer = provider.getSigner();
      await signer
        .sendTransaction({
          to: contractAddress,
          value: parseEther("0.1"),
          gasLimit: 210000,
        })
        .catch(console.error);
    } else {
      sendTransaction({
        to: contractAddress,
        value: parseEther("0.1"),
        gas: 210000,
      });
    }
  };

  const handleSend = async () => {
    if (needsVerification) {
      let res = await authenticate().catch(console.error);
      // let provider = ethers.getDefaultProvider("http://localhost:8545");
      let mainSigner = signer;
      if (isMMSDK) {
        const ethereum = MMSDK.getProvider();
        const provider = new ethers.providers.Web3Provider(ethereum as any);

        mainSigner = provider.getSigner();
      }
      const myContract = new ethers.Contract(
        contractAddress,
        txauthenticator_abi,
        mainSigner
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
      (window as any).my_modal_1.close();
    } else {
      // simpleTransfer

      if (isMMSDK) {
        const ethereum = MMSDK.getProvider();
        const provider = new ethers.providers.Web3Provider(ethereum as any);

        let signer = provider.getSigner();
        const myContract = new ethers.Contract(
          contractAddress,
          txauthenticator_abi,
          signer
        );
        await myContract
          .simpleTransfer(addressToSendTo, amountToSend, {
            gasLimit: 600000,
          })
          .catch(console.error);
      } else {
        console.log(
          // @ts-ignore
          simpleTransferWrite({ args: [addressToSendTo, amountToSend] } as any)
        );
      }
      (window as any).my_modal_1.close();
    }
  };

  return (
    <div>
      <div className="p-10">
        {/* {address} */}

        <div className="flex border rounded-md p-4 text-[#9A9A9A] my-2 space-x-2 items-center">
          <img height={"49px"} width={"49px"} src={nounCircle} />
          <div>
            {address &&
              address.substring(0, 5) +
                "..." +
                address.substring(address.length - 4, address.length - 1)}
          </div>
          <img height={"40px"} width={"40px"} src={goodShield} />
          <div>
            {contractBalance
              ? contractBalance.formatted + contractBalance.symbol
              : ""}
          </div>
          <img height={"40px"} width={"40px"} src={wallet} />
          <div>{myBalance ? myBalance.formatted + myBalance.symbol : ""}</div>
          <div>
            <button
              className="btn btn-primary btn-outline"
              onClick={async () => {
                await handleDeposit();
              }}
            >
              Deposit
            </button>
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
        <div className="flex border items-center rounded-md p-4 text-[#9A9A9A] my-2">
          <img
            className="mr-4"
            height={"50px"}
            width={"50px"}
            src={greenShield}
          />
          2FA is enabled.
        </div>
        <div className="flex flex-col border rounded-md p-4  my-2">
          <div className="bold flex mb-6">
            <b>Wallet Settings</b>
          </div>
          <div className="columns-2">
            <div>
              <div className="text-[#6B7280]">Contract Address</div>
            </div>
            <div>{contractAddress}</div>
          </div>
          <div className="columns-2">
            <div>
              <div className="text-[#6B7280]">Daily Transaction Limit</div>
            </div>
            <div>{txLimit && txLimit.toString()}</div>
          </div>
          <div className="columns-2">
            <div>
              <div className="text-[#6B7280]">Security Key</div>
            </div>
            <div className="flex items-center">
              <img height={"40px"} width={"40px"} src={yubikey} />
              <div className="flex flex-col">
                <div>Yubikey NFC</div>
                <div style={{ fontSize: "10px" }}>Added July 23rd</div>
              </div>
            </div>
          </div>

          <dialog id="my_modal_1" className="modal">
            <form method="dialog" className="modal-box p-10">
              <div className="  items-center">
                <div className="mb-8">
                  <b>Transfer funds</b>
                </div>
                <div className="flex mb-4">Send to</div>
                <input
                  className="input input-bordered w-full"
                  value={addressToSendTo}
                  onChange={(e) => setAddressToSendTo(e.target.value)}
                  placeholder="Enter an address or ENS"
                ></input>
                <div className="flex my-4">Amount</div>
                <div className="flex items-center">
                  <input
                    className="input input-bordered w-full mr-2"
                    type="number"
                    value={amountToSend}
                    onChange={(e) => setAmountToSend(+e.target.value)}
                    placeholder="Enter an amount"
                  ></input>
                  {"  "}
                  WEI
                </div>
                {needsVerification && (
                  <div className="flex items-center py-4">
                    <img height={"50px"} width={"50px"} src={yubikeyOrange} />
                    <div className="text-[#B78719]">
                      This amount is greater than your daily limit. 2FA
                      verification required.
                    </div>
                  </div>
                )}
                <div className="flex items-center my-8">
                  <div
                    className="btn btn-primary text-white w-full"
                    onClick={async () =>
                      await handleSend().catch(console.error)
                    }
                  >
                    Send
                  </div>
                </div>
              </div>
            </form>
          </dialog>
        </div>
      </div>
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
