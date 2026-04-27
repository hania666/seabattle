// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title Sea3Battle PvE Bot Match
/// @notice Solo matches against a bot. Player pays a micro-stake (100% to the
///         platform), plays off-chain, and the server records a signed result
///         that mints XP on-chain.
/// @dev    Per-player usage caps (`dailyLimit`, `cooldown`) live on-chain to
///         resist farm bots. Server signatures are domain-separated with
///         `address(this)` + `block.chainid` to prevent cross-deployment replay.
///         `Ownable2Step` (audit H1) requires explicit `acceptOwnership()`,
///         and `Pausable` (audit H2) only halts new matches — in-flight
///         result recording stays live so paused matches can still be
///         finalised on disk.
contract BotMatch is Ownable2Step, ReentrancyGuard, Pausable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    enum Difficulty {
        Easy,
        Normal,
        Hard
    }

    enum MatchStatus {
        None,
        Pending,
        Completed
    }

    struct BotMatchState {
        address player;
        Difficulty difficulty;
        MatchStatus status;
        uint64 createdAt;
    }

    struct PlayerStats {
        uint128 totalXp;
        uint32 dailyMatches;
        uint32 lastMatchDay;
        uint64 lastMatchTimestamp;
        uint32 streakDays;
        uint32 lastStreakDay;
    }

    /// @notice Prefix tag for result signatures.
    bytes32 public constant RESULT_TAG = keccak256("SEA3BATTLE_BOT_RESULT_V1");

    /// @notice Extra XP for the first win of a UTC day.
    uint256 public constant DAILY_BONUS_XP = 25;
    /// @notice Extra XP when the player completes a 7-day win streak.
    uint256 public constant WEEKLY_STREAK_XP = 500;
    /// @notice Days of uninterrupted daily wins required for `WEEKLY_STREAK_XP`.
    uint32 public constant STREAK_LENGTH = 7;

    /// @notice Seconds in a UTC day.
    uint32 public constant DAY = 1 days;

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

    /// @notice Auto-incrementing nonce used to derive unique match ids.
    uint256 public nextMatchNonce;

    /// @notice Accumulated protocol revenue from bot matches.
    uint256 public accumulatedFees;

    mapping(bytes32 matchId => BotMatchState) public botMatches;
    mapping(address => PlayerStats) public playerStats;

    event BotMatchStarted(
        bytes32 indexed matchId, address indexed player, Difficulty difficulty, uint256 fee
    );
    event BotMatchResultRecorded(
        bytes32 indexed matchId, address indexed player, bool won, uint256 xpAwarded
    );
    event ServerSignerUpdated(address indexed previous, address indexed current);
    event EntryFeeUpdated(Difficulty indexed difficulty, uint256 previous, uint256 current);
    event XpRewardUpdated(Difficulty indexed difficulty, uint256 previous, uint256 current);
    event DailyLimitUpdated(uint8 previous, uint8 current);
    event CooldownUpdated(uint32 previous, uint32 current);
    event FeesWithdrawn(address indexed to, uint256 amount);

    error InvalidServerSigner();
    error InvalidLimit();
    error InvalidFee();
    error CooldownActive();
    error DailyLimitReached();
    error MatchNotPending();
    error InvalidSignature();
    error TransferFailed();

    constructor(
        address _serverSigner,
        uint256[3] memory _entryFees,
        uint256[3] memory _xpRewards,
        uint8 _dailyLimit,
        uint32 _cooldown
    ) Ownable(msg.sender) {
        // Ownable2Step inherits Ownable's constructor; deployer is initial
        // owner. Transfer to multisig + acceptOwnership() before mainnet.
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

    // --- Match lifecycle -----------------------------------------------------

    /// @notice Open a new PvE match against the bot.
    /// @dev The match is "Pending" until the server posts a signed result via
    ///      `recordResult`. The ETH stake is immediately credited to platform fees.
    function playBot(Difficulty difficulty)
        external
        payable
        whenNotPaused
        returns (bytes32 matchId)
    {
        uint256 required = entryFee[difficulty];
        if (msg.value != required) revert InvalidFee();

        PlayerStats storage stats = playerStats[msg.sender];
        uint32 today = uint32(block.timestamp / DAY);

        // Reset the daily counter when the UTC day changes.
        if (stats.lastMatchDay != today) {
            stats.lastMatchDay = today;
            stats.dailyMatches = 0;
        }

        if (
            cooldown > 0 && stats.lastMatchTimestamp != 0
                && block.timestamp < uint256(stats.lastMatchTimestamp) + cooldown
        ) {
            revert CooldownActive();
        }
        if (stats.dailyMatches >= dailyLimit) revert DailyLimitReached();

        stats.dailyMatches += 1;
        stats.lastMatchTimestamp = uint64(block.timestamp);

        accumulatedFees += msg.value;

        matchId = keccak256(
            abi.encode(address(this), block.chainid, nextMatchNonce++, msg.sender, block.timestamp)
        );
        botMatches[matchId] = BotMatchState({
            player: msg.sender,
            difficulty: difficulty,
            status: MatchStatus.Pending,
            createdAt: uint64(block.timestamp)
        });

        emit BotMatchStarted(matchId, msg.sender, difficulty, msg.value);
    }

    /// @notice Server-signed result. Awards XP on win (with daily/streak bonuses).
    function recordResult(bytes32 matchId, bool won, bytes calldata signature) external {
        BotMatchState storage m = botMatches[matchId];
        if (m.status != MatchStatus.Pending) revert MatchNotPending();

        bytes32 digest = resultDigest(matchId, m.player, won);
        if (digest.recover(signature) != serverSigner) revert InvalidSignature();

        m.status = MatchStatus.Completed;

        uint256 awarded = 0;
        if (won) {
            PlayerStats storage stats = playerStats[m.player];
            uint32 today = uint32(block.timestamp / DAY);

            awarded = xpReward[m.difficulty];

            // Daily bonus: first *win* of the day.
            if (stats.lastStreakDay != today) {
                awarded += DAILY_BONUS_XP;

                // Streak accounting: consecutive daily wins.
                if (stats.lastStreakDay == today - 1) {
                    stats.streakDays += 1;
                } else {
                    stats.streakDays = 1;
                }
                stats.lastStreakDay = today;

                if (stats.streakDays == STREAK_LENGTH) {
                    awarded += WEEKLY_STREAK_XP;
                    stats.streakDays = 0; // reset so the next 7-win streak also pays
                }
            }

            stats.totalXp += uint128(awarded);
        }

        emit BotMatchResultRecorded(matchId, m.player, won, awarded);
    }

    // --- Views ---------------------------------------------------------------

    /// @notice Hash the server must sign for `recordResult` to succeed.
    function resultDigest(bytes32 matchId, address player, bool won) public view returns (bytes32) {
        return keccak256(abi.encode(RESULT_TAG, block.chainid, address(this), matchId, player, won))
            .toEthSignedMessageHash();
    }

    function getPlayerXP(address player) external view returns (uint256) {
        return playerStats[player].totalXp;
    }

    function getDailyMatches(address player) external view returns (uint32) {
        PlayerStats storage stats = playerStats[player];
        uint32 today = uint32(block.timestamp / DAY);
        return stats.lastMatchDay == today ? stats.dailyMatches : 0;
    }

    function getStreakDays(address player) external view returns (uint32) {
        return playerStats[player].streakDays;
    }

    // --- Admin ---------------------------------------------------------------

    function setServerSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert InvalidServerSigner();
        emit ServerSignerUpdated(serverSigner, newSigner);
        serverSigner = newSigner;
    }

    /// @notice Halt new PvE matches. In-flight `recordResult` stays live so
    ///         already-paid matches can still be finalised.
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
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
        if (!ok) revert TransferFailed();
        emit FeesWithdrawn(to, amount);
    }
}
