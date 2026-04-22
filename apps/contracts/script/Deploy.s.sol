// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {BattleshipLobby} from "../src/BattleshipLobby.sol";
import {BotMatch} from "../src/BotMatch.sol";

/// @notice Deploy Sea3Battle contracts to Abstract Sepolia / Mainnet.
/// @dev Abstract uses zkStack; for actual on-chain deployment use
///      `foundry-zksync` with the `--zksync` flag. Locally this script can
///      also be dry-run against anvil for sanity checks.
contract Deploy is Script {
    function run() external returns (BattleshipLobby lobby, BotMatch bot) {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address serverSigner = vm.envAddress("SERVER_SIGNER");
        uint256 maxStake = vm.envOr("MAX_STAKE", uint256(0.01 ether));
        uint16 feeBps = uint16(vm.envOr("FEE_BPS", uint256(500)));

        uint256[3] memory botFees =
            [uint256(0.0001 ether), uint256(0.0005 ether), uint256(0.001 ether)];
        uint256[3] memory botXp = [uint256(50), uint256(75), uint256(100)];

        vm.startBroadcast(deployerKey);
        lobby = new BattleshipLobby(serverSigner, maxStake, feeBps);
        bot = new BotMatch(serverSigner, botFees, botXp, 10, 5 minutes);
        vm.stopBroadcast();

        console2.log("BattleshipLobby:", address(lobby));
        console2.log("BotMatch:       ", address(bot));
    }
}
