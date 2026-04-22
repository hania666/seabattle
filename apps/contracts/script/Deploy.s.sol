// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {BattleshipLobby} from "../src/BattleshipLobby.sol";
import {BotMatch} from "../src/BotMatch.sol";

/// @notice Deploys BattleshipLobby and BotMatch to the configured chain.
/// @dev Reads from env:
///   - PRIVATE_KEY       (required) deployer key
///   - SERVER_SIGNER     (required) ECDSA address that signs match results
///   - MAX_STAKE         (optional, default 0.01 ether) PvP max stake per player
///   - FEE_BPS           (optional, default 500 = 5%)   PvP platform fee
///   - TIMEOUT_SECONDS   (optional, default 3600)       PvP idle timeout
///   - BOT_DAILY_LIMIT   (optional, default 10)         PvE matches per UTC day
///   - BOT_COOLDOWN_SECS (optional, default 300)        PvE cooldown between matches
contract Deploy is Script {
    function run() external returns (BattleshipLobby lobby, BotMatch bot) {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address serverSigner = vm.envAddress("SERVER_SIGNER");

        uint256 maxStake = vm.envOr("MAX_STAKE", uint256(0.01 ether));
        uint16 feeBps = uint16(vm.envOr("FEE_BPS", uint256(500)));
        uint32 timeoutSeconds = uint32(vm.envOr("TIMEOUT_SECONDS", uint256(1 hours)));

        uint8 botDailyLimit = uint8(vm.envOr("BOT_DAILY_LIMIT", uint256(10)));
        uint32 botCooldown = uint32(vm.envOr("BOT_COOLDOWN_SECS", uint256(5 minutes)));

        uint256[3] memory botFees =
            [uint256(0.0001 ether), uint256(0.0005 ether), uint256(0.001 ether)];
        uint256[3] memory botXp = [uint256(50), uint256(75), uint256(100)];

        vm.startBroadcast(deployerKey);
        lobby = new BattleshipLobby(serverSigner, maxStake, feeBps, timeoutSeconds);
        bot = new BotMatch(serverSigner, botFees, botXp, botDailyLimit, botCooldown);
        vm.stopBroadcast();

        console2.log("BattleshipLobby:", address(lobby));
        console2.log("BotMatch:", address(bot));
    }
}
