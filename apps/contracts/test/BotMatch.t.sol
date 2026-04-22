// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {BotMatch} from "../src/BotMatch.sol";

contract BotMatchTest is Test {
    BotMatch internal bot;

    address internal owner = address(0xA11CE);
    address internal serverSigner = address(0xB0B);
    address internal rando = address(0xDEAD);

    uint256[3] internal fees = [uint256(0.0001 ether), uint256(0.0005 ether), uint256(0.001 ether)];
    uint256[3] internal xp = [uint256(50), uint256(75), uint256(100)];
    uint8 internal constant DAILY_LIMIT = 10;
    uint32 internal constant COOLDOWN = 5 minutes;

    function setUp() public {
        vm.prank(owner);
        bot = new BotMatch(serverSigner, fees, xp, DAILY_LIMIT, COOLDOWN);
    }

    function test_constructorSetsState() public view {
        assertEq(bot.owner(), owner);
        assertEq(bot.serverSigner(), serverSigner);
        assertEq(bot.entryFee(BotMatch.Difficulty.Easy), fees[0]);
        assertEq(bot.entryFee(BotMatch.Difficulty.Normal), fees[1]);
        assertEq(bot.entryFee(BotMatch.Difficulty.Hard), fees[2]);
        assertEq(bot.xpReward(BotMatch.Difficulty.Easy), xp[0]);
        assertEq(bot.xpReward(BotMatch.Difficulty.Normal), xp[1]);
        assertEq(bot.xpReward(BotMatch.Difficulty.Hard), xp[2]);
        assertEq(bot.dailyLimit(), DAILY_LIMIT);
        assertEq(bot.cooldown(), COOLDOWN);
    }

    function test_constructorReverts_invalidSigner() public {
        vm.expectRevert(BotMatch.InvalidServerSigner.selector);
        new BotMatch(address(0), fees, xp, DAILY_LIMIT, COOLDOWN);
    }

    function test_constructorReverts_invalidLimit() public {
        vm.expectRevert(BotMatch.InvalidLimit.selector);
        new BotMatch(serverSigner, fees, xp, 0, COOLDOWN);
    }

    function test_setServerSigner_onlyOwner() public {
        vm.prank(rando);
        vm.expectRevert();
        bot.setServerSigner(address(0xCAFE));

        vm.prank(owner);
        bot.setServerSigner(address(0xCAFE));
        assertEq(bot.serverSigner(), address(0xCAFE));
    }

    function test_setEntryFee_onlyOwner() public {
        vm.prank(rando);
        vm.expectRevert();
        bot.setEntryFee(BotMatch.Difficulty.Easy, 0.002 ether);

        vm.prank(owner);
        bot.setEntryFee(BotMatch.Difficulty.Easy, 0.002 ether);
        assertEq(bot.entryFee(BotMatch.Difficulty.Easy), 0.002 ether);
    }

    function test_setDailyLimit_rejectsZero() public {
        vm.prank(owner);
        vm.expectRevert(BotMatch.InvalidLimit.selector);
        bot.setDailyLimit(0);
    }

    function test_getPlayerXP_startsAtZero() public view {
        assertEq(bot.getPlayerXP(rando), 0);
    }
}
