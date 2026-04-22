# Sea3Battle — Contracts

Solidity smart contracts for Sea3Battle, built with [Foundry](https://book.getfoundry.sh/).

## Contracts

- **`BattleshipLobby.sol`** — PvP lobby: players stake equal ETH, winner claims
  95 % of the pot after submitting an ECDSA-signed result from the match server.
  Timeout fallback returns stakes if no claim is made within the deadline.
- **`BotMatch.sol`** — PvE micro-match registry: records server-signed match
  results and tracks per-player XP, daily caps, and cooldowns.

Both contracts:

- Inherit `Ownable` + `ReentrancyGuard` from OpenZeppelin 5.
- Verify an off-chain server signer via `ECDSA.recover`.
- Enforce a `maxStake` cap (≤ 0.01 ETH by default) until audit.

## Commands

```bash
forge build
forge test -vvv
forge fmt
```

## Deployment

See `script/Deploy.s.sol`. Deploys to Abstract Chain (zkSync Era L2).

> **Note:** Abstract uses zkStack. For on-chain deployment, use
> [`foundry-zksync`](https://github.com/matter-labs/foundry-zksync) instead of
> vanilla Foundry. Local `forge test` still works with vanilla Foundry because
> the contracts are fully EVM-compatible.

```bash
# Compile + test with vanilla Foundry
forge build && forge test

# Deploy with foundry-zksync (install separately)
forge script script/Deploy.s.sol --zksync \
  --rpc-url $ABSTRACT_SEPOLIA_RPC \
  --private-key $PRIVATE_KEY \
  --broadcast
```

## Environment

See [`.env.example`](./.env.example).
