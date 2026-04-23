import { parseEther } from "viem";

export interface StakeOption {
  id: string;
  label: string;
  eth: string;
  wei: bigint;
  description: string;
}

export const STAKE_OPTIONS: readonly StakeOption[] = [
  { id: "low", label: "Skirmish", eth: "0.001", wei: parseEther("0.001"), description: "Fast rounds, low risk." },
  { id: "med", label: "Standard", eth: "0.005", wei: parseEther("0.005"), description: "Balanced PvP duel." },
  { id: "high", label: "High stakes", eth: "0.01", wei: parseEther("0.01"), description: "Max stake, biggest pot." },
] as const;

export function findStake(id: string): StakeOption | undefined {
  return STAKE_OPTIONS.find((o) => o.id === id);
}
