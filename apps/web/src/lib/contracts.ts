export const BOT_MATCH_ADDRESS = (import.meta.env.VITE_BOT_MATCH_ADDRESS ?? "") as `0x${string}` | "";
export const BATTLESHIP_LOBBY_ADDRESS = (import.meta.env.VITE_BATTLESHIP_LOBBY_ADDRESS ?? "") as
  | `0x${string}`
  | "";

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
] as const;
