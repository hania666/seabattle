export const BOT_MATCH_ADDRESS = (import.meta.env.VITE_BOT_MATCH_ADDRESS ?? "") as `0x${string}` | "";
export const BATTLESHIP_LOBBY_ADDRESS = (import.meta.env.VITE_BATTLESHIP_LOBBY_ADDRESS ?? "") as
  | `0x${string}`
  | "";

export const battleshipLobbyAbi = [
  {
    type: "function",
    name: "createLobby",
    stateMutability: "payable",
    inputs: [],
    outputs: [{ name: "matchId", type: "bytes32" }],
  },
  {
    type: "function",
    name: "joinLobby",
    stateMutability: "payable",
    inputs: [{ name: "matchId", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "claimWin",
    stateMutability: "nonpayable",
    inputs: [
      { name: "matchId", type: "bytes32" },
      { name: "winner", type: "address" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "claimTimeout",
    stateMutability: "nonpayable",
    inputs: [{ name: "matchId", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "lobbies",
    stateMutability: "view",
    inputs: [{ name: "matchId", type: "bytes32" }],
    outputs: [
      { name: "playerA", type: "address" },
      { name: "playerB", type: "address" },
      { name: "stake", type: "uint256" },
      { name: "createdAt", type: "uint64" },
      { name: "status", type: "uint8" },
    ],
  },
  {
    type: "event",
    name: "LobbyCreated",
    inputs: [
      { name: "matchId", type: "bytes32", indexed: true },
      { name: "playerA", type: "address", indexed: true },
      { name: "stake", type: "uint256", indexed: false },
    ],
  },
] as const;

export const botMatchAbi = [
  {
    type: "function",
    name: "playBot",
    stateMutability: "payable",
    inputs: [{ name: "difficulty", type: "uint8" }],
    outputs: [{ name: "matchId", type: "bytes32" }],
  },
  {
    type: "function",
    name: "entryFee",
    stateMutability: "view",
    inputs: [{ name: "difficulty", type: "uint8" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getPlayerXP",
    stateMutability: "view",
    inputs: [{ name: "player", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getDailyMatches",
    stateMutability: "view",
    inputs: [{ name: "player", type: "address" }],
    outputs: [{ name: "", type: "uint32" }],
  },
  {
    type: "function",
    name: "recordResult",
    stateMutability: "nonpayable",
    inputs: [
      { name: "matchId", type: "bytes32" },
      { name: "won", type: "bool" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "event",
    name: "BotMatchStarted",
    inputs: [
      { name: "matchId", type: "bytes32", indexed: true },
      { name: "player", type: "address", indexed: true },
      { name: "difficulty", type: "uint8", indexed: false },
      { name: "fee", type: "uint256", indexed: false },
    ],
  },
] as const;
