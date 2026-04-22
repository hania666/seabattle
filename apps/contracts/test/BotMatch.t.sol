// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {BotMatch} from "../src/BotMatch.sol";

contract BotMatchTest is Test {
    BotMatch internal bot;

    address internal owner = address(0xA11CE);
    address internal alice = makeAddr("alice");
    address internal rando = makeAddr("rando");

    uint256 internal serverPk = 0xB0B0B0B0;
    address internal serverSigner;

    uint256[3] internal fees = [uint256(0.0001 ether), uint256(0.0005 ether), uint256(0.001 ether)];
    uint256[3] internal xp = [uint256(50), uint256(75), uint256(100)];
    uint8 internal constant DAILY_LIMIT = 10;
    uint32 internal constant COOLDOWN = 5 minutes;

    function setUp() public {
        serverSigner = vm.addr(serverPk);
        vm.prank(owner);
        bot = new BotMatch(serverSigner, fees, xp, DAILY_LIMIT, COOLDOWN);

        vm.deal(alice, 10 ether);
        vm.deal(rando, 10 ether);
        // Start well clear of the UTC day boundary to avoid flaky time math.
        vm.warp(30 days);
    }

    // --- Constructor ---------------------------------------------------------

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

    // --- playBot -------------------------------------------------------------

    function test_playBot_happyPath() public {
        vm.prank(alice);
        bytes32 id = bot.playBot{value: fees[0]}(BotMatch.Difficulty.Easy);
        (address player, BotMatch.Difficulty difficulty, BotMatch.MatchStatus status,) =
            bot.botMatches(id);

        assertEq(player, alice);
        assertEq(uint8(difficulty), uint8(BotMatch.Difficulty.Easy));
        assertEq(uint8(status), uint8(BotMatch.MatchStatus.Pending));
        assertEq(bot.accumulatedFees(), fees[0]);
        assertEq(bot.getDailyMatches(alice), 1);
    }

    function test_playBot_reverts_wrongFee() public {
        vm.prank(alice);
        vm.expectRevert(BotMatch.InvalidFee.selector);
        bot.playBot{value: fees[0] - 1}(BotMatch.Difficulty.Easy);
    }

    function test_playBot_reverts_cooldown() public {
        vm.prank(alice);
        bot.playBot{value: fees[0]}(BotMatch.Difficulty.Easy);

        vm.prank(alice);
        vm.expectRevert(BotMatch.CooldownActive.selector);
        bot.playBot{value: fees[0]}(BotMatch.Difficulty.Easy);
    }

    function test_playBot_afterCooldownWorks() public {
        vm.prank(alice);
        bot.playBot{value: fees[0]}(BotMatch.Difficulty.Easy);

        vm.warp(block.timestamp + COOLDOWN);
        vm.prank(alice);
        bot.playBot{value: fees[0]}(BotMatch.Difficulty.Easy);
        assertEq(bot.getDailyMatches(alice), 2);
    }

    function test_playBot_dailyLimit() public {
        for (uint256 i = 0; i < DAILY_LIMIT; i++) {
            vm.warp(block.timestamp + COOLDOWN);
            vm.prank(alice);
            bot.playBot{value: fees[0]}(BotMatch.Difficulty.Easy);
        }
        vm.warp(block.timestamp + COOLDOWN);
        vm.prank(alice);
        vm.expectRevert(BotMatch.DailyLimitReached.selector);
        bot.playBot{value: fees[0]}(BotMatch.Difficulty.Easy);
    }

    function test_playBot_dailyCounterResetsNextDay() public {
        for (uint256 i = 0; i < DAILY_LIMIT; i++) {
            vm.warp(block.timestamp + COOLDOWN);
            vm.prank(alice);
            bot.playBot{value: fees[0]}(BotMatch.Difficulty.Easy);
        }
        vm.warp(block.timestamp + 1 days + 1);
        vm.prank(alice);
        bot.playBot{value: fees[0]}(BotMatch.Difficulty.Easy);
        assertEq(bot.getDailyMatches(alice), 1);
    }

    // --- recordResult --------------------------------------------------------

    function test_recordResult_win_awardsXpWithDailyBonus() public {
        vm.prank(alice);
        bytes32 id = bot.playBot{value: fees[1]}(BotMatch.Difficulty.Normal);

        bytes memory sig = _signResult(id, alice, true);
        bot.recordResult(id, true, sig);

        // Normal xp (75) + first-of-day bonus (25) = 100.
        assertEq(bot.getPlayerXP(alice), 100);
        assertEq(bot.getStreakDays(alice), 1);
    }

    function test_recordResult_loss_noXp() public {
        vm.prank(alice);
        bytes32 id = bot.playBot{value: fees[0]}(BotMatch.Difficulty.Easy);

        bytes memory sig = _signResult(id, alice, false);
        bot.recordResult(id, false, sig);
        assertEq(bot.getPlayerXP(alice), 0);
        assertEq(bot.getStreakDays(alice), 0);
    }

    function test_recordResult_reverts_badSig() public {
        vm.prank(alice);
        bytes32 id = bot.playBot{value: fees[0]}(BotMatch.Difficulty.Easy);

        uint256 attackerPk = 0xABCDEF;
        bytes32 digest = bot.resultDigest(id, alice, true);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(attackerPk, digest);
        bytes memory sig = abi.encodePacked(r, s, v);
        vm.expectRevert(BotMatch.InvalidSignature.selector);
        bot.recordResult(id, true, sig);
    }

    function test_recordResult_reverts_notPending() public {
        vm.prank(alice);
        bytes32 id = bot.playBot{value: fees[0]}(BotMatch.Difficulty.Easy);

        bytes memory sig = _signResult(id, alice, true);
        bot.recordResult(id, true, sig);

        vm.expectRevert(BotMatch.MatchNotPending.selector);
        bot.recordResult(id, true, sig);
    }

    function test_recordResult_reverts_badSignedValue() public {
        vm.prank(alice);
        bytes32 id = bot.playBot{value: fees[0]}(BotMatch.Difficulty.Easy);
        bytes memory winSig = _signResult(id, alice, true);
        vm.expectRevert(BotMatch.InvalidSignature.selector);
        bot.recordResult(id, false, winSig); // result flag not covered by sig → reverts
    }

    function test_streak_awardsWeeklyBonusOnDay7() public {
        // Need 7 consecutive daily wins.
        uint256 expectedXp;
        for (uint256 day = 0; day < 7; day++) {
            vm.prank(alice);
            bytes32 id = bot.playBot{value: fees[0]}(BotMatch.Difficulty.Easy);
            bytes memory sig = _signResult(id, alice, true);
            bot.recordResult(id, true, sig);

            expectedXp += 50 + 25; // easy xp + daily bonus
            if (day == 6) expectedXp += 500; // weekly streak
            vm.warp(block.timestamp + 1 days + 1); // advance to next day
        }
        assertEq(bot.getPlayerXP(alice), expectedXp);
    }

    function test_streak_breaksOnSkippedDay() public {
        // Day 1 win
        vm.prank(alice);
        bytes32 id1 = bot.playBot{value: fees[0]}(BotMatch.Difficulty.Easy);
        bot.recordResult(id1, true, _signResult(id1, alice, true));
        assertEq(bot.getStreakDays(alice), 1);

        // Skip a day
        vm.warp(block.timestamp + 2 days + 1);

        vm.prank(alice);
        bytes32 id2 = bot.playBot{value: fees[0]}(BotMatch.Difficulty.Easy);
        bot.recordResult(id2, true, _signResult(id2, alice, true));

        assertEq(bot.getStreakDays(alice), 1, "streak reset");
    }

    function test_secondWinSameDay_noDailyBonus() public {
        vm.prank(alice);
        bytes32 id1 = bot.playBot{value: fees[0]}(BotMatch.Difficulty.Easy);
        bot.recordResult(id1, true, _signResult(id1, alice, true));

        vm.warp(block.timestamp + COOLDOWN);
        vm.prank(alice);
        bytes32 id2 = bot.playBot{value: fees[0]}(BotMatch.Difficulty.Easy);
        bot.recordResult(id2, true, _signResult(id2, alice, true));

        // 50 + 25 (first) + 50 (second same day, no bonus).
        assertEq(bot.getPlayerXP(alice), 125);
    }

    function testFuzz_xpReward_byDifficulty(uint8 rawDifficulty) public {
        uint8 diffIdx = uint8(bound(rawDifficulty, 0, 2));
        BotMatch.Difficulty d = BotMatch.Difficulty(diffIdx);
        uint256 fee = bot.entryFee(d);

        vm.prank(alice);
        bytes32 id = bot.playBot{value: fee}(d);
        bot.recordResult(id, true, _signResult(id, alice, true));

        uint256 expected = bot.xpReward(d) + 25; // first win of day
        assertEq(bot.getPlayerXP(alice), expected);
    }

    // --- Admin ---------------------------------------------------------------

    function test_setters_onlyOwner() public {
        vm.startPrank(rando);
        vm.expectRevert();
        bot.setServerSigner(rando);
        vm.expectRevert();
        bot.setEntryFee(BotMatch.Difficulty.Easy, 1);
        vm.expectRevert();
        bot.setXpReward(BotMatch.Difficulty.Easy, 1);
        vm.expectRevert();
        bot.setDailyLimit(5);
        vm.expectRevert();
        bot.setCooldown(0);
        vm.expectRevert();
        bot.withdrawFees(payable(rando));
        vm.stopPrank();
    }

    function test_withdrawFees_paysRecipient() public {
        vm.prank(alice);
        bot.playBot{value: fees[2]}(BotMatch.Difficulty.Hard);
        address payable to = payable(makeAddr("treasury"));
        vm.prank(owner);
        bot.withdrawFees(to);
        assertEq(to.balance, fees[2]);
        assertEq(bot.accumulatedFees(), 0);
    }

    // --- Helpers -------------------------------------------------------------

    function _signResult(bytes32 matchId, address player, bool won)
        internal
        view
        returns (bytes memory)
    {
        bytes32 digest = bot.resultDigest(matchId, player, won);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(serverPk, digest);
        return abi.encodePacked(r, s, v);
    }
}
