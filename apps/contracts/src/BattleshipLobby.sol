// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title Sea3Battle PvP Lobby
/// @notice Two players lock equal ETH stakes; the winner claims 95% of the pot
///         using a server-signed result. Stakes can be refunded via timeout if
///         no claim is made before `timeoutDuration` elapses.
/// @dev    Security knobs:
///         - `maxStake` caps per-player stakes (pre-audit safety).
///         - `feeBps` is bounded to 1000 (10%) — well above the 5% spec target
///           but prevents accidental misconfiguration.
///         - `ReentrancyGuard` on every external ETH sink.
///         - `Ownable2Step` requires an explicit `acceptOwnership()` from the
///           pending owner, so a typo in `transferOwnership(...)` doesn't
///           brick admin access (audit H1).
///         - `Pausable` only gates entries (`createLobby`, `joinLobby`).
///           In-flight settlement (`claimWin`) and refund-after-timeout
///           (`claimTimeout`) deliberately stay live even when paused so a
///           pause cannot freeze user funds (audit H2).
///         - ECDSA signatures are domain-separated with `address(this)` and
///           `block.chainid` so a signed result from testnet cannot be
///           replayed on mainnet (or a sibling deployment).
contract BattleshipLobby is Ownable2Step, ReentrancyGuard, Pausable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    enum LobbyStatus {
        None,
        Waiting,
        Active,
        Done,
        Cancelled
    }

    struct Lobby {
        address playerA;
        address playerB;
        uint256 stake;
        uint64 createdAt;
        LobbyStatus status;
    }

    /// @notice EIP-191 message prefix tag used when server signs match results.
    bytes32 public constant CLAIM_TAG = keccak256("SEA3BATTLE_CLAIM_V1");

    /// @notice Address whose ECDSA signature authorizes match results.
    address public serverSigner;

    /// @notice Maximum per-player stake. Pre-audit safety cap.
    uint256 public maxStake;

    /// @notice Platform fee on winnings, in basis points (500 = 5%).
    uint16 public feeBps;

    /// @notice Seconds before an idle lobby/match can be refunded via timeout.
    uint32 public timeoutDuration;

    /// @notice Auto-incrementing counter used to derive unique match ids.
    uint256 public nextLobbyNonce;

    /// @notice Accumulated fees available for `withdrawFees`.
    uint256 public accumulatedFees;

    mapping(bytes32 matchId => Lobby) public lobbies;

    event LobbyCreated(bytes32 indexed matchId, address indexed playerA, uint256 stake);
    event LobbyJoined(bytes32 indexed matchId, address indexed playerB);
    event MatchClaimed(
        bytes32 indexed matchId, address indexed winner, uint256 payout, uint256 fee
    );
    event MatchTimedOut(bytes32 indexed matchId);
    event ServerSignerUpdated(address indexed previous, address indexed current);
    event MaxStakeUpdated(uint256 previous, uint256 current);
    event FeeBpsUpdated(uint16 previous, uint16 current);
    event TimeoutDurationUpdated(uint32 previous, uint32 current);
    event FeesWithdrawn(address indexed to, uint256 amount);

    error InvalidServerSigner();
    error InvalidFeeBps();
    error InvalidStake();
    error InvalidLobby();
    error SelfJoin();
    error StakeMismatch();
    error InvalidWinner();
    error InvalidSignature();
    error TooEarly();
    error TransferFailed();

    constructor(address _serverSigner, uint256 _maxStake, uint16 _feeBps, uint32 _timeoutDuration)
        Ownable(msg.sender)
    {
        // Ownable2Step inherits Ownable's constructor; the deployer is the
        // initial owner and must call `transferOwnership(safe)` +
        // `acceptOwnership()` from the multisig before mainnet handoff.
        if (_serverSigner == address(0)) revert InvalidServerSigner();
        if (_feeBps > 1_000) revert InvalidFeeBps(); // hard cap 10%
        if (_maxStake == 0) revert InvalidStake();
        serverSigner = _serverSigner;
        maxStake = _maxStake;
        feeBps = _feeBps;
        timeoutDuration = _timeoutDuration;
    }

    // --- Match lifecycle -----------------------------------------------------

    /// @notice Create a new lobby and lock the caller's stake.
    /// @return matchId Deterministic id derived from the contract, chain, and nonce.
    function createLobby() external payable whenNotPaused returns (bytes32 matchId) {
        if (msg.value == 0 || msg.value > maxStake) revert InvalidStake();
        matchId = keccak256(
            abi.encode(address(this), block.chainid, nextLobbyNonce++, msg.sender, block.timestamp)
        );
        lobbies[matchId] = Lobby({
            playerA: msg.sender,
            playerB: address(0),
            stake: msg.value,
            createdAt: uint64(block.timestamp),
            status: LobbyStatus.Waiting
        });
        emit LobbyCreated(matchId, msg.sender, msg.value);
    }

    /// @notice Join an existing waiting lobby. `msg.value` must equal `stake`.
    function joinLobby(bytes32 matchId) external payable whenNotPaused {
        Lobby storage l = lobbies[matchId];
        if (l.status != LobbyStatus.Waiting) revert InvalidLobby();
        if (msg.sender == l.playerA) revert SelfJoin();
        if (msg.value != l.stake) revert StakeMismatch();
        l.playerB = msg.sender;
        l.status = LobbyStatus.Active;
        emit LobbyJoined(matchId, msg.sender);
    }

    /// @notice Claim winnings after the server signs the result.
    /// @dev The signature signs an EIP-191 personal message over
    ///      `abi.encode(CLAIM_TAG, chainid, address(this), matchId, winner)`.
    function claimWin(bytes32 matchId, address winner, bytes calldata signature)
        external
        nonReentrant
    {
        Lobby storage l = lobbies[matchId];
        if (l.status != LobbyStatus.Active) revert InvalidLobby();
        if (winner != l.playerA && winner != l.playerB) revert InvalidWinner();

        bytes32 digest = claimDigest(matchId, winner);
        if (digest.recover(signature) != serverSigner) revert InvalidSignature();

        uint256 pot = l.stake * 2;
        uint256 fee = (pot * feeBps) / 10_000;
        uint256 payout = pot - fee;

        accumulatedFees += fee;
        l.status = LobbyStatus.Done;

        (bool ok,) = payable(winner).call{value: payout}("");
        if (!ok) revert TransferFailed();

        emit MatchClaimed(matchId, winner, payout, fee);
    }

    /// @notice Refund both players when the match has been idle too long.
    /// @dev Callable by anyone after `timeoutDuration` elapses from creation.
    function claimTimeout(bytes32 matchId) external nonReentrant {
        Lobby storage l = lobbies[matchId];
        LobbyStatus status = l.status;
        if (status != LobbyStatus.Waiting && status != LobbyStatus.Active) {
            revert InvalidLobby();
        }
        if (block.timestamp < uint256(l.createdAt) + timeoutDuration) revert TooEarly();

        uint256 stake = l.stake;
        address playerA = l.playerA;
        address playerB = l.playerB;
        l.status = LobbyStatus.Cancelled;

        if (playerA != address(0)) {
            (bool okA,) = payable(playerA).call{value: stake}("");
            if (!okA) revert TransferFailed();
        }
        if (playerB != address(0)) {
            (bool okB,) = payable(playerB).call{value: stake}("");
            if (!okB) revert TransferFailed();
        }

        emit MatchTimedOut(matchId);
    }

    // --- Views ---------------------------------------------------------------

    /// @notice Hash that the server must sign for `claimWin` to succeed.
    function claimDigest(bytes32 matchId, address winner) public view returns (bytes32) {
        return keccak256(abi.encode(CLAIM_TAG, block.chainid, address(this), matchId, winner))
            .toEthSignedMessageHash();
    }

    // --- Admin ---------------------------------------------------------------

    function setServerSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert InvalidServerSigner();
        emit ServerSignerUpdated(serverSigner, newSigner);
        serverSigner = newSigner;
    }

    /// @notice Halt new lobbies. In-flight settlement / refunds remain live.
    /// @dev    Use this if the server starts issuing bad signatures or an
    ///         off-chain bug is detected. Restoring play requires `unpause`.
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setMaxStake(uint256 newMax) external onlyOwner {
        if (newMax == 0) revert InvalidStake();
        emit MaxStakeUpdated(maxStake, newMax);
        maxStake = newMax;
    }

    function setFeeBps(uint16 newFeeBps) external onlyOwner {
        if (newFeeBps > 1_000) revert InvalidFeeBps();
        emit FeeBpsUpdated(feeBps, newFeeBps);
        feeBps = newFeeBps;
    }

    function setTimeoutDuration(uint32 newTimeout) external onlyOwner {
        emit TimeoutDurationUpdated(timeoutDuration, newTimeout);
        timeoutDuration = newTimeout;
    }

    function withdrawFees(address payable to) external onlyOwner nonReentrant {
        uint256 amount = accumulatedFees;
        accumulatedFees = 0;
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit FeesWithdrawn(to, amount);
    }
}
