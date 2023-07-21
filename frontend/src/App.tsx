import React from "react";
import logo from "./logo.svg";
import "./App.css";
import { type PublicKeyCredentialDescriptorJSON } from "@github/webauthn-json";
import { getRegistrations, saveRegistration, setRegistrations } from "./state";

import {
  parseCreationOptionsFromJSON,
  create,
  get,
  parseRequestOptionsFromJSON,
  supported,
  AuthenticationPublicKeyCredential,
} from "@github/webauthn-json/browser-ponyfill";
const base64url = require("base64url");
const cbor = require("cbor");
const vanillacbor = require("./vanillacbor");

function registeredCredentials(): PublicKeyCredentialDescriptorJSON[] {
  return getRegistrations().map((reg) => ({
    id: reg.rawId,
    type: reg.type,
  }));
}

async function register(): Promise<void> {
  const cco = parseCreationOptionsFromJSON({
    publicKey: {
      challenge: "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
      rp: { name: "Localhost, Inc." },
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
  console.log("registration");
  let resJSON = res.toJSON();
  console.log(resJSON);
  let attestationObjectBuffer = base64url.toBuffer(
    resJSON.response.attestationObject
  );
  let ctapMakeCredResp = cbor.decodeAllSync(attestationObjectBuffer)[0];
  console.log(ctapMakeCredResp);
  console.log(ctapMakeCredResp);
  console.log(parseAuthData(ctapMakeCredResp.authData));
  saveRegistration(res);
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
  // let authObjectBuffer = base64url.toBuffer(
  //   authJSON.response.authenticatorData
  // );
  // let authCtapMakeCredResp = cbor.decodeAllSync(authObjectBuffer)[0];
  // console.log(authCtapMakeCredResp);
  // console.log(authCtapMakeCredResp.authData);
  // console.log(parseAuthData(authCtapMakeCredResp.authData));
  return auth;
}

const parseAuthData = (buffer) => {
  if (buffer.byteLength < 37)
    throw new Error("Authenticator Data must be at least 37 bytes long!");

  let rpIdHash = buffer.slice(0, 32);
  buffer = buffer.slice(32);

  /* Flags */
  let flagsBuffer = buffer.slice(0, 1);
  buffer = buffer.slice(1);
  let flagsInt = flagsBuffer[0];
  let up = !!(flagsInt & 0x01); // Test of User Presence
  let uv = !!(flagsInt & 0x04); // User Verification
  let at = !!(flagsInt & 0x40); // Attestation data
  let ed = !!(flagsInt & 0x80); // Extension data
  let flags = { up, uv, at, ed, flagsInt };

  let counterBuffer = buffer.slice(0, 4);
  buffer = buffer.slice(4);
  let counter = counterBuffer.readUInt32BE(0);

  /* Attested credential data */
  let aaguid = undefined;
  let aaguidBuffer = undefined;
  let credIdBuffer = undefined;
  let cosePublicKeyBuffer = undefined;
  let attestationMinLen = 16 + 2 + 16 + 42; // aaguid + credIdLen + credId + pk

  if (at) {
    // Attested Data
    if (buffer.byteLength < attestationMinLen)
      throw new Error(
        `It seems as the Attestation Data flag is set, but the remaining data is smaller than ${attestationMinLen} bytes. You might have set AT flag for the assertion response.`
      );

    aaguid = buffer.slice(0, 16).toString("hex");
    buffer = buffer.slice(16);
    aaguidBuffer = `${aaguid.slice(0, 8)}-${aaguid.slice(8, 12)}-${aaguid.slice(
      12,
      16
    )}-${aaguid.slice(16, 20)}-${aaguid.slice(20)}`;

    let credIdLenBuffer = buffer.slice(0, 2);
    buffer = buffer.slice(2);
    let credIdLen = credIdLenBuffer.readUInt16BE(0);
    credIdBuffer = buffer.slice(0, credIdLen);
    buffer = buffer.slice(credIdLen);

    let pubKeyLength = vanillacbor.decodeOnlyFirst(buffer).byteLength;
    cosePublicKeyBuffer = buffer.slice(0, pubKeyLength);
    buffer = buffer.slice(pubKeyLength);
  }

  let coseExtensionsDataBuffer = undefined;
  if (ed) {
    // Extension Data
    let extensionsDataLength = vanillacbor.decodeOnlyFirst(buffer).byteLength;

    coseExtensionsDataBuffer = buffer.slice(0, extensionsDataLength);
    buffer = buffer.slice(extensionsDataLength);
  }

  if (buffer.byteLength)
    throw new Error("Failed to decode authData! Leftover bytes been detected!");

  return {
    rpIdHash,
    counter,
    flags,
    counterBuffer,
    aaguid,
    credIdBuffer,
    cosePublicKeyBuffer,
    coseExtensionsDataBuffer,
  };
};

async function clear(): Promise<void> {
  setRegistrations([]);
}

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <button onClick={async () => await register().catch(console.error)}>
          Register
        </button>
        <button onClick={async () => await authenticate().catch(console.error)}>
          Authenticate
        </button>
      </header>
    </div>
  );
}

export default App;
