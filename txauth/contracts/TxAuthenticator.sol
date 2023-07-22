// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {Webauthn} from "./Webauthn.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract TxAuthenticator is Webauthn, Ownable {
    address yubikeyPubKeyContract;
    mapping(bytes32 => bool) public challenges;
    uint spendLimitPerDay;
    uint spentToday;
    uint lastBlock;

    constructor(
        address _yubikeyPubKeyContract,
        uint spendLimit,
        address owner
    ) payable {
        yubikeyPubKeyContract = _yubikeyPubKeyContract;
        spendLimitPerDay = spendLimit;
        transferOwnership(owner);
    }

    function getSpendLimitPerDay() public view returns (uint) {
        return spendLimitPerDay;
    }

    function setSpendLimitPerDay(uint newLimit) public {
        spendLimitPerDay = newLimit;
    }

    function simpleTransfer(
        address payable recipient,
        uint amount
    ) public onlyOwner {
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
    ) public onlyOwner {
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
