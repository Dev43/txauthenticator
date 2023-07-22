// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {Webauthn} from "./Webauthn.sol";
import "hardhat/console.sol";

contract TxAuthenticator is Webauthn {
    address yubikeyPubKeyContract;
    mapping(bytes32 => bool) public challenges;
    uint spendLimitPerDay;
    uint spentToday;
    uint lastBlock;

    constructor(address _yubikeyPubKeyContract, uint spendLimit) payable {
        yubikeyPubKeyContract = _yubikeyPubKeyContract;
        spendLimitPerDay = spendLimit;
    }

    function getSpendLimitPerDay() public view returns (uint) {
        return spendLimitPerDay;
    }

    function setSpendLimitPerDay(uint newLimit) public {
        spendLimitPerDay = newLimit;
    }

    function simpleTransfer(address payable recipient, uint amount) public {
        if (spentToday + amount <= spendLimitPerDay) {
            spentToday += amount;
        } else if (block.number - lastBlock < 7200) {
            spentToday = amount;
        } else {
            revert("Daily limit exceeded");
        }
        recipient.transfer(amount);
    }

    function authenticatedTransfer(
        address payable recipient,
        uint amount,
        bytes memory authenticatorData,
        bytes1 authenticatorDataFlagMask,
        bytes memory clientData,
        bytes32 clientChallenge,
        uint clientChallengeDataOffset,
        uint[2] memory rs
    ) public {
        // we assume a 12s block, so 7200 for a day
        if (spentToday + amount <= spendLimitPerDay) {
            spentToday += amount;
        } else if (block.number - lastBlock < 7200) {
            spentToday = amount;
        } else {
            validate(
                authenticatorData,
                authenticatorDataFlagMask,
                clientData,
                clientChallenge,
                clientChallengeDataOffset,
                rs,
                yubikeyPubKeyContract
            );
            challenges[clientChallenge] = true;
        }
        recipient.transfer(amount);
    }
}
