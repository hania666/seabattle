// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {BattleshipLobby} from "../src/BattleshipLobby.sol";

contract BattleshipLobbyTest is Test {
    BattleshipLobby internal lobby;

    address internal owner = address(0xA11CE);
    address internal serverSigner = address(0xB0B);
    address internal rando = address(0xDEAD);

    uint256 internal constant MAX_STAKE = 0.01 ether;
    uint16 internal constant FEE_BPS = 500; // 5 %

    function setUp() public {
        vm.prank(owner);
        lobby = new BattleshipLobby(serverSigner, MAX_STAKE, FEE_BPS);
    }

    function test_constructorSetsState() public view {
        assertEq(lobby.owner(), owner, "owner");
        assertEq(lobby.serverSigner(), serverSigner, "server signer");
        assertEq(lobby.maxStake(), MAX_STAKE, "max stake");
        assertEq(lobby.feeBps(), FEE_BPS, "fee bps");
        assertEq(lobby.accumulatedFees(), 0, "accumulated fees");
    }

    function test_constructorReverts_invalidSigner() public {
        vm.expectRevert(BattleshipLobby.InvalidServerSigner.selector);
        new BattleshipLobby(address(0), MAX_STAKE, FEE_BPS);
    }

    function test_constructorReverts_invalidStake() public {
        vm.expectRevert(BattleshipLobby.InvalidStake.selector);
        new BattleshipLobby(serverSigner, 0, FEE_BPS);
    }

    function test_constructorReverts_invalidFeeBps() public {
        vm.expectRevert(BattleshipLobby.InvalidFeeBps.selector);
        new BattleshipLobby(serverSigner, MAX_STAKE, 1_001);
    }

    function test_setServerSigner_onlyOwner() public {
        address newSigner = address(0xCAFE);
        vm.prank(rando);
        vm.expectRevert();
        lobby.setServerSigner(newSigner);

        vm.prank(owner);
        lobby.setServerSigner(newSigner);
        assertEq(lobby.serverSigner(), newSigner);
    }

    function test_setMaxStake_onlyOwner() public {
        vm.prank(rando);
        vm.expectRevert();
        lobby.setMaxStake(1 ether);

        vm.prank(owner);
        lobby.setMaxStake(0.05 ether);
        assertEq(lobby.maxStake(), 0.05 ether);
    }

    function test_setFeeBps_onlyOwner_respectsCap() public {
        vm.prank(owner);
        vm.expectRevert(BattleshipLobby.InvalidFeeBps.selector);
        lobby.setFeeBps(1_001);

        vm.prank(owner);
        lobby.setFeeBps(250);
        assertEq(lobby.feeBps(), 250);
    }
}
