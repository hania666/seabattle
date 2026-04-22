import { privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";

export interface Env {
  port: number;
  corsOrigin: string;
  chainId: number;
  lobbyAddress: `0x${string}` | null;
  botMatchAddress: `0x${string}` | null;
  signer: ReturnType<typeof privateKeyToAccount>;
}

function readAddress(name: string): `0x${string}` | null {
  const raw = process.env[name];
  if (!raw) return null;
  if (!/^0x[a-fA-F0-9]{40}$/.test(raw)) {
    throw new Error(`${name} is not a valid 0x address: ${raw}`);
  }
  return raw as `0x${string}`;
}

function readSignerKey(): Hex {
  const raw = process.env.SERVER_SIGNER_KEY;
  if (!raw) {
    throw new Error(
      "SERVER_SIGNER_KEY is required. Generate one with: node -e \"console.log('0x'+require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }
  const hex = raw.startsWith("0x") ? raw : `0x${raw}`;
  if (!/^0x[a-fA-F0-9]{64}$/.test(hex)) {
    throw new Error("SERVER_SIGNER_KEY must be a 32-byte hex string");
  }
  return hex as Hex;
}

export function loadEnv(): Env {
  const signer = privateKeyToAccount(readSignerKey());
  return {
    port: Number(process.env.PORT ?? 3001),
    corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    chainId: Number(process.env.CHAIN_ID ?? 11124), // Abstract Sepolia
    lobbyAddress: readAddress("LOBBY_ADDRESS"),
    botMatchAddress: readAddress("BOT_MATCH_ADDRESS"),
    signer,
  };
}
