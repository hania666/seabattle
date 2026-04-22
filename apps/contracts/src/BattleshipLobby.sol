// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title Sea3Battle PvP Lobby
/// @notice Skeleton contract for PvP battleship matches with equal ETH stakes.
/// @dev Full lobby/match flow is implemented in a follow-up phase; this file
///      provides the state layout, events, and admin surface so the rest of
///      the stack (frontend, server, CI) can be scaffolded in parallel.
contract BattleshipLobby is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;

    /// @dev Lifecycle of a single lobby/match.
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

    /// @notice Address whose ECDSA signature authorizes match results.
    address public serverSigner;

    /// @notice Maximum allowed per-player stake. Pre-audit safety cap.
    uint256 public maxStake;

    /// @notice Platform fee on winnings, in basis points (500 = 5%).
    uint16 public feeBps;

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
    event FeesWithdrawn(address indexed to, uint256 amount);

    error InvalidServerSigner();
    error InvalidFeeBps();
    error InvalidStake();

    constructor(address _serverSigner, uint256 _maxStake, uint16 _feeBps) Ownable(msg.sender) {
        if (_serverSigner == address(0)) revert InvalidServerSigner();
        if (_feeBps > 1_000) revert InvalidFeeBps(); // hard cap 10%
        if (_maxStake == 0) revert InvalidStake();
        serverSigner = _serverSigner;
        maxStake = _maxStake;
        feeBps = _feeBps;
    }

    // --- Admin ---------------------------------------------------------------

    function setServerSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert InvalidServerSigner();
        emit ServerSignerUpdated(serverSigner, newSigner);
        serverSigner = newSigner;
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

    /// @notice Withdraw platform fees accumulated from resolved matches.
    function withdrawFees(address payable to) external onlyOwner nonReentrant {
        uint256 amount = accumulatedFees;
        accumulatedFees = 0;
        (bool ok,) = to.call{value: amount}("");
        require(ok, "transfer failed");
        emit FeesWithdrawn(to, amount);
    }

    // --- Match lifecycle (implemented in follow-up phase) --------------------
    //
    // createLobby()           payable  -> creates lobby, locks stake
    // joinLobby(matchId)      payable  -> joins lobby, locks equal stake
    // claimWin(matchId, sig)  external -> pays 95% to winner, 5% to fees
    // claimTimeout(matchId)   external -> refunds stakes after inactivity
}
