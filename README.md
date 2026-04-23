# Sea3Battle

Web3 PvP Battleship on [Abstract Chain](https://abs.xyz) (zkSync Era L2).
Players stake ETH in a smart contract, play a 10×10 Battleship match, and the
winner claims 95% of the pot automatically. A PvE mode lets solo players farm
on-chain activity against a bot.

> **Status:** Pre-development. MVP roadmap: 8 weeks. See
> [`docs/SPEC.md`](docs/SPEC.md) for the full spec.

## Monorepo layout

```
apps/
├── contracts/   # Solidity + Foundry — BattleshipLobby.sol, BotMatch.sol
├── web/         # React + Vite + Tailwind + Abstract Global Wallet
└── server/      # Node.js + Express + socket.io — matchmaking & result signing
```

Each app is self-contained with its own `package.json` / `foundry.toml`.

## Stack

| Layer      | Tech                                                           |
| ---------- | -------------------------------------------------------------- |
| Contracts  | Solidity 0.8.24 · Foundry · OpenZeppelin · foundry-zksync      |
| Frontend   | React 18 · Vite 5 · Tailwind 3 · wagmi 2 · viem 2 · AGW React  |
| Backend    | Node 20 · Express 4 · socket.io 4 · ethers 6                   |
| Blockchain | Abstract Chain (zkSync-based L2, EVM-compatible)               |

## Quick start

### Prerequisites

- Node.js 20+ (see `.nvmrc`)
- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- Git

### Install

```bash
git clone https://github.com/hania666/seabattle.git
cd seabattle

# Contracts
cd apps/contracts
forge install
forge build
forge test

# Frontend
cd ../web
npm install
npm run dev

# Backend
cd ../server
npm install
npm run dev
```

### Environment

Copy `.env.example` to `.env` in each app that needs it and fill in the values.

```bash
cp .env.example .env
```

## Contracts

- **BattleshipLobby.sol** — PvP matches, ETH stakes, ECDSA-verified winner claim, 5 % fee.
- **BotMatch.sol** — PvE matches vs bot, micro-stakes, XP tracking, daily limits.

Security: `ReentrancyGuard` on every withdrawal path, `Ownable` for admin
functions, `ECDSA.recover` to verify server-signed match results, and a
`maxStake` cap until the contracts are audited.

## Deployment

- **Testnet:** Abstract Sepolia (chain id 11124)
- **Mainnet:** Abstract Mainnet (chain id 2741)

Deploy scripts live in `apps/contracts/script/`. End-to-end deployment runbook
(faucets, contracts, backend, frontend, smoke-test checklist) is in
[`docs/PHASE_6_DEPLOY.md`](docs/PHASE_6_DEPLOY.md).

## License

[MIT](LICENSE)
