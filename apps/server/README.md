# Sea3Battle — Server

Node.js + Express + socket.io server that handles:

- **Matchmaking:** pairs two players who created compatible lobbies on-chain.
- **Realtime play:** authoritative game state over WebSocket — ship positions
  stay on the server so browsers can't cheat.
- **Result signing:** after a match ends, the server signs `{matchId, winner}`
  with an ECDSA key that's whitelisted on `BattleshipLobby` / `BotMatch`. The
  winner submits that signature on-chain to claim their payout.

## Commands

```bash
npm install
npm run dev       # hot reload with tsx
npm run build     # compile to dist/
npm start         # run compiled server
npm run typecheck # tsc --noEmit
```

## Environment

Copy [`.env.example`](./.env.example) to `.env` and fill in the signer key and
contract addresses.

> **Security:** `SERVER_SIGNER_PRIVATE_KEY` must never be committed or exposed
> client-side. Rotate it by calling `setServerSigner(newAddress)` on both
> contracts as owner.
