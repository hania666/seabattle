# Sea3Battle — Specification

Canonical spec lives in [`Sea3Battle_Spec.docx`](./Sea3Battle_Spec.docx). This
file summarizes the parts the codebase is structured around so new contributors
can get oriented without opening Word.

## Product

Web3 PvP Battleship on Abstract Chain (zkSync-based L2).

- **PvP** — two players each stake 0.005 / 0.01 / 0.05 ETH into
  `BattleshipLobby`. Classic 10×10 board, 5 ships (1×5, 1×4, 1×3, 1×3, 1×2).
  30 s turn timer, 3 skipped turns = loss. Winner claims 95 % of the pot via a
  server-signed ECDSA signature; 5 % stays as platform fee.
- **PvE** — solo vs bot (3 difficulties). Micro-stakes 0.0001–0.001 ETH per
  match. 10 matches/day per wallet, 5-minute cooldown. Each match is an
  on-chain tx → player earns Abstract XP automatically. XP rewards: Easy 50,
  Normal 75, Hard 100. Daily bonus +25, weekly streak +500.

### Level progression

| Level | Name           | XP needed | Unlocks                         |
| ----- | -------------- | --------- | ------------------------------- |
| 1     | Sailor         | 0         | PvE Easy                        |
| 5     | Boatswain      | 500       | PvP mode, profile badge         |
| 10    | Captain        | 2 000     | Nickname color, grid frame      |
| 20    | Admiral        | 10 000    | Exclusive ship skin             |
| 50    | Fleet Legend   | 100 000   | NFT whitelist, permanent status |

## Architecture

Hybrid: game logic off-chain (server), money flow on-chain.

- **Frontend** — React 18 + Vite + Tailwind + wagmi/viem + Abstract Global Wallet
- **Backend** — Node 20 + Express + socket.io + ethers
- **Blockchain** — Solidity 0.8.24 + Foundry + OpenZeppelin 5 on Abstract Chain

### PvP match flow

1. Player A calls `createLobby()` — stake locked in contract.
2. Player B calls `joinLobby(matchId)` — equal stake locked.
3. Server picks up `LobbyReady` event and spawns a match session.
4. Both players place ships; position hashes go to the server.
5. Moves stream over WebSocket; server validates every shot.
6. On game end, server signs `{matchId, winner}` with its ECDSA key.
7. Winner calls `claimWin(matchId, sig)` — contract verifies, pays 95 %.
8. 5 % fee stays in contract; owner withdraws via `withdrawFees()`.

### Anti-cheat

- Ship positions live only on the server.
- Commit–reveal: hash of positions at match start, full positions revealed at end.
- Server is authoritative timer / AFK detection — client can't slow time.
- Server signer is whitelisted on-chain; leaks are mitigated by `maxStake` cap
  (0.01 ETH pre-audit) and rotation via `setServerSigner`.

## Smart contracts

### `BattleshipLobby.sol`

| Function                      | Visibility     | Purpose                                     |
| ----------------------------- | -------------- | ------------------------------------------- |
| `createLobby()`               | payable        | create match, lock A's stake                |
| `joinLobby(matchId)`          | payable        | join match, lock equal B stake              |
| `claimWin(matchId, sig)`      | external       | verify server sig, pay 95 % winner, 5 % fee |
| `claimTimeout(matchId)`       | external       | refund both stakes after inactivity         |
| `withdrawFees(to)`            | onlyOwner      | withdraw accumulated 5 % fees               |
| `setMaxStake`, `setFeeBps`    | onlyOwner      | pre-audit safety knobs                      |
| `setServerSigner`             | onlyOwner      | rotate off-chain signer key                 |

### `BotMatch.sol`

| Function                             | Visibility | Purpose                                          |
| ------------------------------------ | ---------- | ------------------------------------------------ |
| `playBot(difficulty)`                | payable    | start PvE match, accept micro-stake              |
| `recordResult(matchId, won, sig)`    | external   | server-signed finalize + XP accrual              |
| `getPlayerXP(address)`               | view       | cumulative XP                                    |
| `getDailyMatches(address)`           | view       | matches used today (anti-farm cap)               |
| `setEntryFee`, `setXpReward`, …      | onlyOwner  | admin knobs                                      |

Both inherit `Ownable` + `ReentrancyGuard` and verify an off-chain signer via
`ECDSA.recover`.

## Deployment targets

- **Testnet** — Abstract Sepolia (chain id 11124)
- **Mainnet** — Abstract Mainnet (chain id 2741)

Abstract uses zkStack, so on-chain deployment requires
[`foundry-zksync`](https://github.com/matter-labs/foundry-zksync) with the
`--zksync` flag. Local `forge test` uses vanilla Foundry because the contracts
are EVM-compatible.

## Security knobs (pre-audit)

- `maxStake = 0.01 ether` hard ceiling
- `ReentrancyGuard` on every withdrawal path
- `ECDSA.recover` — only the whitelisted server signer can authorize payouts
- Server signer key lives in `.env`, never in code, rotatable on-chain

## 8-week MVP roadmap

| Week | Scope                                                            |
| ---- | ---------------------------------------------------------------- |
| 1    | Frontend: single-player vs bot, UI 10×10, ship logic             |
| 2    | Backend: matchmaking, socket.io, PvP over a shared link          |
| 3    | Contracts: `BattleshipLobby` + `BotMatch` + Foundry tests        |
| 4    | Web3 frontend: AGW integration, stake UI, on-chain tx flow       |
| 5–6  | Testing: 20+ matches, edge cases, mobile                         |
| 7–8  | Mainnet launch, README, demo video, grant application            |

## Revenue model

- 5 % PvP fee
- 100 % PvE entry fee (platform vs bot)
- Abstract Developer Reward (monthly)
- Abstract Gaming Fund grant (target: $5k–50k)
- v2: NFT ship skins (5 % royalty), tournaments

## Risks → mitigations

| Risk                                     | Mitigation                                             |
| ---------------------------------------- | ------------------------------------------------------ |
| Contract bug on mainnet (CRITICAL)       | `maxStake` 0.01 ETH, proxy pattern, Foundry fuzz tests |
| Abstract SDK breaking change (HIGH)      | Pin versions in `package.json`, watch Discord          |
| Server signer key leaked (MEDIUM)        | `.env` only, stake cap, rotate via `setServerSigner`   |
| Farm bots on PvE (LOW)                   | Daily cap 10, 5-min cooldown, pattern detection        |
| WebSocket drops (LOW)                    | Reconnection + state restore by `matchId`              |
