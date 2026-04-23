# Phase 6 — Testnet Deployment Runbook

End-to-end steps to deploy `BattleshipLobby` + `BotMatch` to
**Abstract Sepolia** (chain id `11124`) and wire the backend / frontend.

## 0. Prerequisites

- A funded deployer EOA on Abstract Sepolia (≈ 0.02 ETH is plenty for both
  contracts + a handful of tests). Faucets:
  - https://www.alchemy.com/faucets/abstract-testnet (requires 0.001 ETH on
    mainnet)
  - https://faucet.triangleplatform.com/abstract/testnet (no signup)
  - https://thirdweb.com/abstract-testnet
- `DEPLOYER_PRIVATE_KEY` exported in env (never commit).
- [`foundry-zksync`](https://github.com/matter-labs/foundry-zksync) installed
  (Abstract is a zkStack chain — vanilla Foundry cannot deploy, though it
  can run local tests).

```bash
curl -L https://raw.githubusercontent.com/matter-labs/foundry-zksync/main/install-foundry-zksync | bash
foundryup-zksync
# or, if you already have foundry, add the --zksync flag once the patched
# binary is on PATH.
```

## 1. Generate the server signer key

This is a separate EOA whose private key lives *only* on the backend. Its
public address is passed to both contracts at deploy time as the `serverSigner`
so `claimWin` / `recordResult` can verify ECDSA signatures.

```bash
node -e "console.log('0x'+require('crypto').randomBytes(32).toString('hex'))"
# → 0x... (save as SERVER_SIGNER_KEY in the backend env)

# Derive the address (matches what we'll pass to the constructors):
cast wallet address --private-key $SERVER_SIGNER_KEY
# → 0x...   (save as SERVER_SIGNER_ADDRESS)
```

## 2. Deploy contracts

Env vars (see `script/Deploy.s.sol` for defaults):

| var | required | default | purpose |
| --- | --- | --- | --- |
| `PRIVATE_KEY` | yes | — | deployer EOA key |
| `SERVER_SIGNER` | yes | — | server signer address (step 1) |
| `MAX_STAKE` | no | `0.01 ether` | PvP cap until audit |
| `FEE_BPS` | no | `500` | 5 % PvP fee |
| `TIMEOUT_SECONDS` | no | `3600` | PvP idle timeout |
| `BOT_DAILY_LIMIT` | no | `10` | PvE matches / UTC day |
| `BOT_COOLDOWN_SECS` | no | `300` | PvE cooldown between matches |

```bash
cd apps/contracts
export RPC_URL=https://api.testnet.abs.xyz
export PRIVATE_KEY=0x...          # funded EOA
export SERVER_SIGNER=0x...        # step 1

forge script script/Deploy.s.sol \
  --zksync \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast
```

Outputs: `BattleshipLobby` address, `BotMatch` address. Verify on
https://sepolia.abscan.org.

## 3. Backend env

`apps/server/.env`:

```
PORT=3001
CORS_ORIGIN=https://<frontend-host>
CHAIN_ID=11124
LOBBY_ADDRESS=0x...               # from step 2
BOT_MATCH_ADDRESS=0x...           # from step 2
SERVER_SIGNER_KEY=0x...           # from step 1, DO NOT COMMIT
```

Local smoke:

```bash
cd apps/server
npm install
npm test                  # 18 tests should pass
npm run dev               # http://localhost:3001/health → {ok:true, signer:...}
```

Deploy to Fly.io (free tier):

```bash
flyctl launch --no-deploy --name sea3battle-server
flyctl secrets set SERVER_SIGNER_KEY=0x... LOBBY_ADDRESS=0x... \
  BOT_MATCH_ADDRESS=0x... CHAIN_ID=11124 CORS_ORIGIN=https://<frontend>
flyctl deploy
```

Verify: `curl https://sea3battle-server.fly.dev/health` returns the signer
address from step 1.

## 4. Frontend env

`apps/web/.env`:

```
VITE_BATTLESHIP_LOBBY_ADDRESS=0x...       # from step 2
VITE_BOT_MATCH_ADDRESS=0x...              # from step 2
VITE_MATCH_SERVER_URL=https://sea3battle-server.fly.dev
```

Local smoke:

```bash
cd apps/web
npm install
npm run lint && npm run typecheck && npm run test -- --run
npm run dev              # http://localhost:5173
```

Deploy to devinapps.com (built-in) or Vercel:

```bash
npm run build
# then either:
devin deploy frontend --dir=dist
# or
vercel deploy --prod
```

## 5. End-to-end smoke

With the frontend URL:

1. Connect Abstract wallet (AGW).
2. PvE: pick Easy → stake 0.0001 ETH → win → press `Claim XP` →
   `BotMatch.recordResult` mined → XP incremented on-chain.
3. PvP: open two browsers, both pick the same stake →
   host creates lobby, joiner joins → play to finish → winner claims →
   `BattleshipLobby.claimWin` mined → 95 % of pot lands in winner's wallet.
4. Abort flow: in a second match, one browser closes tab after `joinLobby`
   confirms → aborted screen in the survivor's browser exposes
   "Claim timeout refund" → refund tx mines after the 30 min window.

## 6. Explorer references

- Abstract Sepolia explorer: https://sepolia.abscan.org
- RPC: https://api.testnet.abs.xyz
- Bridge: https://portal.abs.xyz/bridge?network=testnet

## Rollback

If a deploy is bad:

1. `flyctl releases` + `flyctl releases rollback <version>` for the backend.
2. Frontend: redeploy previous commit (no contract interaction cached).
3. Contracts: redeploy fresh; update `VITE_*_ADDRESS` + server `LOBBY_ADDRESS`
   env. Old contract still holds any locked stakes — users can still call
   `claimTimeout` directly via Abscan.
