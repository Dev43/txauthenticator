const txauthenticator_abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_yubikeyPubKeyContract",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "spendLimit",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    stateMutability: "payable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "InvalidAuthenticatorData",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidClientData",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidSignature",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "Received",
    type: "event",
  },
  {
    stateMutability: "payable",
    type: "fallback",
  },
  {
    inputs: [
      {
        internalType: "address payable",
        name: "recipient",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "authenticatorData",
        type: "bytes",
      },
      {
        internalType: "bytes1",
        name: "authenticatorDataFlagMask",
        type: "bytes1",
      },
      {
        internalType: "bytes",
        name: "clientData",
        type: "bytes",
      },
      {
        internalType: "bytes32",
        name: "clientChallenge",
        type: "bytes32",
      },
      {
        internalType: "uint256",
        name: "clientChallengeDataOffset",
        type: "uint256",
      },
      {
        internalType: "uint256[2]",
        name: "rs",
        type: "uint256[2]",
      },
    ],
    name: "authenticatedTransfer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    name: "challenges",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes",
        name: "authenticatorData",
        type: "bytes",
      },
      {
        internalType: "bytes1",
        name: "authenticatorDataFlagMask",
        type: "bytes1",
      },
      {
        internalType: "bytes",
        name: "clientData",
        type: "bytes",
      },
      {
        internalType: "bytes32",
        name: "clientChallenge",
        type: "bytes32",
      },
      {
        internalType: "uint256",
        name: "clientChallengeDataOffset",
        type: "uint256",
      },
      {
        internalType: "uint256[2]",
        name: "rs",
        type: "uint256[2]",
      },
      {
        internalType: "address",
        name: "Q",
        type: "address",
      },
    ],
    name: "checkSignature",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "counter",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getSpendLimitPerDay",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newLimit",
        type: "uint256",
      },
    ],
    name: "setSpendLimitPerDay",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address payable",
        name: "recipient",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "simpleTransfer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes",
        name: "authenticatorData",
        type: "bytes",
      },
      {
        internalType: "bytes1",
        name: "authenticatorDataFlagMask",
        type: "bytes1",
      },
      {
        internalType: "bytes",
        name: "clientData",
        type: "bytes",
      },
      {
        internalType: "bytes32",
        name: "clientChallenge",
        type: "bytes32",
      },
      {
        internalType: "uint256",
        name: "clientChallengeDataOffset",
        type: "uint256",
      },
      {
        internalType: "uint256[2]",
        name: "rs",
        type: "uint256[2]",
      },
      {
        internalType: "address",
        name: "Q",
        type: "address",
      },
    ],
    name: "validate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    stateMutability: "payable",
    type: "receive",
  },
];

export default txauthenticator_abi;
