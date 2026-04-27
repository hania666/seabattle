// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test, Vm} from "forge-std/Test.sol";
import {BattleshipLobby} from "../src/BattleshipLobby.sol";

contract BattleshipLobbyTest is Test {
    BattleshipLobby internal lobby;

    address internal owner = address(0xA11CE);
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal rando = makeAddr("rando");

    uint256 internal serverPk = 0xA11AA11A;
    address internal serverSigner;

    uint256 internal constant MAX_STAKE = 0.01 ether;
    uint16 internal constant FEE_BPS = 500; // 5%
    uint32 internal constant TIMEOUT = 10 minutes;

    function setUp() public {
        serverSigner = vm.addr(serverPk);
        vm.prank(owner);
        lobby = new BattleshipLobby(serverSigner, MAX_STAKE, FEE_BPS, TIMEOUT);

        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
        vm.deal(rando, 10 ether);
    }

    // --- Constructor ---------------------------------------------------------

    function test_constructorSetsState() public view {
        assertEq(lobby.owner(), owner, "owner");
        assertEq(lobby.serverSigner(), serverSigner, "server signer");
        assertEq(lobby.maxStake(), MAX_STAKE, "max stake");
        assertEq(lobby.feeBps(), FEE_BPS, "fee bps");
        assertEq(lobby.timeoutDuration(), TIMEOUT, "timeout");
        assertEq(lobby.accumulatedFees(), 0, "fees");
    }

    function test_constructorReverts_invalidSigner() public {
        vm.expectRevert(BattleshipLobby.InvalidServerSigner.selector);
        new BattleshipLobby(address(0), MAX_STAKE, FEE_BPS, TIMEOUT);
    }

    function test_constructorReverts_invalidStake() public {
        vm.expectRevert(BattleshipLobby.InvalidStake.selector);
        new BattleshipLobby(serverSigner, 0, FEE_BPS, TIMEOUT);
    }

    function test_constructorReverts_invalidFeeBps() public {
        vm.expectRevert(BattleshipLobby.InvalidFeeBps.selector);
        new BattleshipLobby(serverSigner, MAX_STAKE, 1_001, TIMEOUT);
    }

    // --- createLobby ---------------------------------------------------------

    function test_createLobby_happyPath() public {
        vm.prank(alice);
        bytes32 matchId = lobby.createLobby{value: 0.005 ether}();

        (
            address pA,
            address pB,
            uint256 stake,
            uint64 createdAt,
            BattleshipLobby.LobbyStatus status
        ) = lobby.lobbies(matchId);

        assertEq(pA, alice);
        assertEq(pB, address(0));
        assertEq(stake, 0.005 ether);
        assertEq(createdAt, uint64(block.timestamp));
        assertEq(uint8(status), uint8(BattleshipLobby.LobbyStatus.Waiting));
        assertEq(address(lobby).balance, 0.005 ether);
    }

    function test_createLobby_reverts_zeroStake() public {
        vm.prank(alice);
        vm.expectRevert(BattleshipLobby.InvalidStake.selector);
        lobby.createLobby{value: 0}();
    }

    function test_createLobby_reverts_overMaxStake() public {
        vm.prank(alice);
        vm.expectRevert(BattleshipLobby.InvalidStake.selector);
        lobby.createLobby{value: MAX_STAKE + 1}();
    }

    function test_createLobby_uniqueIds() public {
        vm.prank(alice);
        bytes32 id1 = lobby.createLobby{value: 0.001 ether}();
        vm.prank(alice);
        bytes32 id2 = lobby.createLobby{value: 0.001 ether}();
        assertTrue(id1 != id2, "ids must differ");
    }

    // --- joinLobby -----------------------------------------------------------

    function test_joinLobby_happyPath() public {
        vm.prank(alice);
        bytes32 id = lobby.createLobby{value: 0.005 ether}();

        vm.prank(bob);
        lobby.joinLobby{value: 0.005 ether}(id);

        (, address pB,,, BattleshipLobby.LobbyStatus status) = lobby.lobbies(id);
        assertEq(pB, bob);
        assertEq(uint8(status), uint8(BattleshipLobby.LobbyStatus.Active));
        assertEq(address(lobby).balance, 0.01 ether);
    }

    function test_joinLobby_reverts_notWaiting() public {
        bytes32 id = _makeActiveMatch(alice, bob, 0.005 ether);
        vm.prank(rando);
        vm.expectRevert(BattleshipLobby.InvalidLobby.selector);
        lobby.joinLobby{value: 0.005 ether}(id);
    }

    function test_joinLobby_reverts_selfJoin() public {
        vm.prank(alice);
        bytes32 id = lobby.createLobby{value: 0.005 ether}();
        vm.prank(alice);
        vm.expectRevert(BattleshipLobby.SelfJoin.selector);
        lobby.joinLobby{value: 0.005 ether}(id);
    }

    function test_joinLobby_reverts_stakeMismatch() public {
        vm.prank(alice);
        bytes32 id = lobby.createLobby{value: 0.005 ether}();
        vm.prank(bob);
        vm.expectRevert(BattleshipLobby.StakeMismatch.selector);
        lobby.joinLobby{value: 0.004 ether}(id);
    }

    // --- claimWin ------------------------------------------------------------

    function test_claimWin_happyPath() public {
        uint256 stake = 0.005 ether;
        bytes32 id = _makeActiveMatch(alice, bob, stake);

        bytes memory sig = _signClaim(id, alice);
        uint256 aliceBefore = alice.balance;

        vm.prank(alice);
        lobby.claimWin(id, alice, sig);

        uint256 pot = stake * 2;
        uint256 fee = (pot * FEE_BPS) / 10_000;
        uint256 payout = pot - fee;

        assertEq(alice.balance - aliceBefore, payout, "winner payout");
        assertEq(lobby.accumulatedFees(), fee, "accumulated fees");

        (,,,, BattleshipLobby.LobbyStatus status) = lobby.lobbies(id);
        assertEq(uint8(status), uint8(BattleshipLobby.LobbyStatus.Done));
    }

    function test_claimWin_reverts_notActive() public {
        vm.prank(alice);
        bytes32 id = lobby.createLobby{value: 0.005 ether}();
        bytes memory sig = _signClaim(id, alice);
        vm.prank(alice);
        vm.expectRevert(BattleshipLobby.InvalidLobby.selector);
        lobby.claimWin(id, alice, sig);
    }

    function test_claimWin_reverts_invalidWinner() public {
        bytes32 id = _makeActiveMatch(alice, bob, 0.005 ether);
        bytes memory sig = _signClaim(id, rando);
        vm.expectRevert(BattleshipLobby.InvalidWinner.selector);
        lobby.claimWin(id, rando, sig);
    }

    function test_claimWin_reverts_wrongSignature() public {
        bytes32 id = _makeActiveMatch(alice, bob, 0.005 ether);
        uint256 attackerPk = 0xBADBADBAD;
        bytes32 digest = lobby.claimDigest(id, alice);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(attackerPk, digest);
        bytes memory sig = abi.encodePacked(r, s, v);
        vm.expectRevert(BattleshipLobby.InvalidSignature.selector);
        lobby.claimWin(id, alice, sig);
    }

    function test_claimWin_reverts_doubleClaim() public {
        bytes32 id = _makeActiveMatch(alice, bob, 0.005 ether);
        bytes memory sig = _signClaim(id, alice);
        lobby.claimWin(id, alice, sig);
        vm.expectRevert(BattleshipLobby.InvalidLobby.selector);
        lobby.claimWin(id, alice, sig);
    }

    function testFuzz_claimWin_stake(uint96 stakeRaw) public {
        stakeRaw = uint96(bound(stakeRaw, 1, MAX_STAKE));
        uint256 stake = stakeRaw;
        bytes32 id = _makeActiveMatch(alice, bob, stake);

        bytes memory sig = _signClaim(id, bob);
        uint256 bobBefore = bob.balance;
        lobby.claimWin(id, bob, sig);

        uint256 pot = stake * 2;
        uint256 fee = (pot * FEE_BPS) / 10_000;
        assertEq(bob.balance - bobBefore, pot - fee);
        assertEq(lobby.accumulatedFees(), fee);
    }

    // --- claimTimeout --------------------------------------------------------

    function test_claimTimeout_waitingRefundsCreator() public {
        vm.prank(alice);
        bytes32 id = lobby.createLobby{value: 0.005 ether}();

        vm.warp(block.timestamp + TIMEOUT + 1);
        uint256 aliceBefore = alice.balance;

        vm.prank(rando);
        lobby.claimTimeout(id);

        assertEq(alice.balance - aliceBefore, 0.005 ether, "refund A");
        (,,,, BattleshipLobby.LobbyStatus status) = lobby.lobbies(id);
        assertEq(uint8(status), uint8(BattleshipLobby.LobbyStatus.Cancelled));
    }

    function test_claimTimeout_activeRefundsBoth() public {
        uint256 stake = 0.005 ether;
        bytes32 id = _makeActiveMatch(alice, bob, stake);
        vm.warp(block.timestamp + TIMEOUT + 1);

        uint256 aliceBefore = alice.balance;
        uint256 bobBefore = bob.balance;

        vm.prank(rando);
        lobby.claimTimeout(id);

        assertEq(alice.balance - aliceBefore, stake);
        assertEq(bob.balance - bobBefore, stake);
        assertEq(address(lobby).balance, 0);
    }

    function test_claimTimeout_reverts_tooEarly() public {
        vm.prank(alice);
        bytes32 id = lobby.createLobby{value: 0.005 ether}();
        vm.expectRevert(BattleshipLobby.TooEarly.selector);
        lobby.claimTimeout(id);
    }

    function test_claimTimeout_reverts_alreadyDone() public {
        bytes32 id = _makeActiveMatch(alice, bob, 0.005 ether);
        bytes memory sig = _signClaim(id, alice);
        lobby.claimWin(id, alice, sig);

        vm.warp(block.timestamp + TIMEOUT + 1);
        vm.expectRevert(BattleshipLobby.InvalidLobby.selector);
        lobby.claimTimeout(id);
    }

    // --- Admin ---------------------------------------------------------------

    function test_withdrawFees_paysOwner() public {
        bytes32 id = _makeActiveMatch(alice, bob, 0.005 ether);
        bytes memory sig = _signClaim(id, alice);
        lobby.claimWin(id, alice, sig);

        uint256 fees = lobby.accumulatedFees();
        assertGt(fees, 0);

        address payable recipient = payable(makeAddr("treasury"));
        vm.prank(owner);
        lobby.withdrawFees(recipient);

        assertEq(recipient.balance, fees);
        assertEq(lobby.accumulatedFees(), 0);
    }

    function test_setters_onlyOwner() public {
        vm.startPrank(rando);
        vm.expectRevert();
        lobby.setServerSigner(rando);
        vm.expectRevert();
        lobby.setMaxStake(1 ether);
        vm.expectRevert();
        lobby.setFeeBps(250);
        vm.expectRevert();
        lobby.setTimeoutDuration(30 minutes);
        vm.expectRevert();
        lobby.withdrawFees(payable(rando));
        vm.stopPrank();
    }

    function test_setServerSigner_rejectsZero() public {
        vm.prank(owner);
        vm.expectRevert(BattleshipLobby.InvalidServerSigner.selector);
        lobby.setServerSigner(address(0));
    }

    function test_setFeeBps_respectsCap() public {
        vm.prank(owner);
        vm.expectRevert(BattleshipLobby.InvalidFeeBps.selector);
        lobby.setFeeBps(1_001);

        vm.prank(owner);
        lobby.setFeeBps(1_000);
        assertEq(lobby.feeBps(), 1_000);
    }

    // --- Helpers -------------------------------------------------------------

    function _makeActiveMatch(address a, address b, uint256 stake) internal returns (bytes32 id) {
        vm.prank(a);
        id = lobby.createLobby{value: stake}();
        vm.prank(b);
        lobby.joinLobby{value: stake}(id);
    }

    function _signClaim(bytes32 matchId, address winner) internal view returns (bytes memory) {
        bytes32 digest = lobby.claimDigest(matchId, winner);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(serverPk, digest);
        return abi.encodePacked(r, s, v);
    }

    // --- Ownable2Step (audit H1) --------------------------------------------

    function test_ownable2Step_pendingOwnerMustAccept() public {
        address newOwner = makeAddr("safe");
        vm.prank(owner);
        lobby.transferOwnership(newOwner);
        // Until acceptance, the original owner is still in charge.
        assertEq(lobby.owner(), owner);
        assertEq(lobby.pendingOwner(), newOwner);

        vm.prank(newOwner);
        lobby.acceptOwnership();
        assertEq(lobby.owner(), newOwner);
        assertEq(lobby.pendingOwner(), address(0));
    }

    function test_ownable2Step_onlyPendingOwnerCanAccept() public {
        vm.prank(owner);
        lobby.transferOwnership(makeAddr("safe"));
        vm.prank(rando);
        vm.expectRevert();
        lobby.acceptOwnership();
    }

    // --- Pausable (audit H2) ------------------------------------------------

    function test_pause_blocksCreateLobby() public {
        vm.prank(owner);
        lobby.pause();
        vm.prank(alice);
        vm.expectRevert();
        lobby.createLobby{value: 0.005 ether}();
    }

    function test_pause_blocksJoinLobby() public {
        vm.prank(alice);
        bytes32 matchId = lobby.createLobby{value: 0.005 ether}();
        vm.prank(owner);
        lobby.pause();
        vm.prank(bob);
        vm.expectRevert();
        lobby.joinLobby{value: 0.005 ether}(matchId);
    }

    /// claim must NOT be gated by pause: pausing should never strand user funds.
    function test_pause_doesNotBlockClaimWin() public {
        bytes32 matchId = _makeActiveMatch(alice, bob, 0.005 ether);
        vm.prank(owner);
        lobby.pause();

        bytes memory sig = _signClaim(matchId, alice);
        uint256 before_ = alice.balance;
        lobby.claimWin(matchId, alice, sig);
        // payout = 0.005 * 2 - fee
        uint256 pot = 0.005 ether * 2;
        uint256 fee = (pot * FEE_BPS) / 10_000;
        assertEq(alice.balance, before_ + (pot - fee));
    }

    /// timeout must NOT be gated by pause either.
    function test_pause_doesNotBlockClaimTimeout() public {
        vm.prank(alice);
        bytes32 matchId = lobby.createLobby{value: 0.005 ether}();
        vm.prank(owner);
        lobby.pause();
        vm.warp(block.timestamp + TIMEOUT + 1);
        // Anyone can call.
        lobby.claimTimeout(matchId);
    }

    function test_unpause_restoresEntries() public {
        vm.prank(owner);
        lobby.pause();
        vm.prank(owner);
        lobby.unpause();
        vm.prank(alice);
        lobby.createLobby{value: 0.005 ether}();
    }

    function test_pause_onlyOwner() public {
        vm.prank(rando);
        vm.expectRevert();
        lobby.pause();
    }
}
