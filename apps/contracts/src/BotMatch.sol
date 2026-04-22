// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title Sea3Battle PvE Bot Match
/// @notice Skeleton contract for the PvE (vs bot) activity-farming mode.
/// @dev Full playBot/recordResult flow and XP accounting are implemented in a
///      follow-up phase. This file pins the storage layout and admin surface.
contract BotMatch is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;

    enum Difficulty {
        Easy,
        Normal,
        Hard
    }

    /// @notice Address whose ECDSA signature authorizes match results.
    address public serverSigner;

    /// @notice Per-difficulty entry fee (wei).
    mapping(Difficulty => uint256) public entryFee;

    /// @notice Per-difficulty XP reward on win.
    mapping(Difficulty => uint256) public xpReward;

    /// @notice Daily match cap per wallet (anti-farm protection).
    uint8 public dailyLimit;

    /// @notice Cooldown between matches per wallet, in seconds.
    uint32 public cooldown;

    /// @notice Cumulative XP per player.
    mapping(address => uint256) public playerXP;

    /// @notice Number of matches played today by a player (resets per UTC day).
    mapping(address => uint32) public dailyMatches;

    /// @notice UTC day index of the last match for a player.
    mapping(address => uint32) public lastMatchDay;

    /// @notice Accumulated protocol revenue from bot matches.
    uint256 public accumulatedFees;

    event BotMatchPlayed(address indexed player, Difficulty difficulty, uint256 fee);
    event BotMatchResultRecorded(
        address indexed player, bytes32 indexed matchId, bool won, uint256 xpAwarded
    );
    event ServerSignerUpdated(address indexed previous, address indexed current);
    event EntryFeeUpdated(Difficulty indexed difficulty, uint256 previous, uint256 current);
    event XpRewardUpdated(Difficulty indexed difficulty, uint256 previous, uint256 current);
    event DailyLimitUpdated(uint8 previous, uint8 current);
    event CooldownUpdated(uint32 previous, uint32 current);
    event FeesWithdrawn(address indexed to, uint256 amount);

    error InvalidServerSigner();
    error InvalidLimit();

    constructor(
        address _serverSigner,
        uint256[3] memory _entryFees,
        uint256[3] memory _xpRewards,
        uint8 _dailyLimit,
        uint32 _cooldown
    ) Ownable(msg.sender) {
        if (_serverSigner == address(0)) revert InvalidServerSigner();
        if (_dailyLimit == 0) revert InvalidLimit();
        serverSigner = _serverSigner;
        entryFee[Difficulty.Easy] = _entryFees[0];
        entryFee[Difficulty.Normal] = _entryFees[1];
        entryFee[Difficulty.Hard] = _entryFees[2];
        xpReward[Difficulty.Easy] = _xpRewards[0];
        xpReward[Difficulty.Normal] = _xpRewards[1];
        xpReward[Difficulty.Hard] = _xpRewards[2];
        dailyLimit = _dailyLimit;
        cooldown = _cooldown;
    }

    // --- Admin ---------------------------------------------------------------

    function setServerSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert InvalidServerSigner();
        emit ServerSignerUpdated(serverSigner, newSigner);
        serverSigner = newSigner;
    }

    function setEntryFee(Difficulty difficulty, uint256 newFee) external onlyOwner {
        emit EntryFeeUpdated(difficulty, entryFee[difficulty], newFee);
        entryFee[difficulty] = newFee;
    }

    function setXpReward(Difficulty difficulty, uint256 newReward) external onlyOwner {
        emit XpRewardUpdated(difficulty, xpReward[difficulty], newReward);
        xpReward[difficulty] = newReward;
    }

    function setDailyLimit(uint8 newLimit) external onlyOwner {
        if (newLimit == 0) revert InvalidLimit();
        emit DailyLimitUpdated(dailyLimit, newLimit);
        dailyLimit = newLimit;
    }

    function setCooldown(uint32 newCooldown) external onlyOwner {
        emit CooldownUpdated(cooldown, newCooldown);
        cooldown = newCooldown;
    }

    function withdrawFees(address payable to) external onlyOwner nonReentrant {
        uint256 amount = accumulatedFees;
        accumulatedFees = 0;
        (bool ok,) = to.call{value: amount}("");
        require(ok, "transfer failed");
        emit FeesWithdrawn(to, amount);
    }

    // --- Views ---------------------------------------------------------------

    function getPlayerXP(address player) external view returns (uint256) {
        return playerXP[player];
    }

    // --- Match lifecycle (implemented in follow-up phase) --------------------
    //
    // playBot(difficulty)                payable   -> open a new bot match
    // recordResult(matchId, won, sig)    external  -> server-signed finalize
    // getDailyMatches(address)           view      -> per-wallet daily usage
}
