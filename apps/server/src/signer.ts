import {
  encodeAbiParameters,
  keccak256,
  type Address,
  type Hex,
  type PrivateKeyAccount,
} from "viem";

export const CLAIM_TAG = keccak256(new TextEncoder().encode("SEA3BATTLE_CLAIM_V1"));
export const RESULT_TAG = keccak256(new TextEncoder().encode("SEA3BATTLE_BOT_RESULT_V1"));

const CLAIM_PARAMS = [
  { type: "bytes32" },
  { type: "uint256" },
  { type: "address" },
  { type: "bytes32" },
  { type: "address" },
] as const;

const RESULT_PARAMS = [
  { type: "bytes32" },
  { type: "uint256" },
  { type: "address" },
  { type: "bytes32" },
  { type: "address" },
  { type: "bool" },
] as const;

export interface ClaimInput {
  chainId: number;
  lobbyAddress: Address;
  matchId: Hex;
  winner: Address;
}

export interface ResultInput {
  chainId: number;
  botMatchAddress: Address;
  matchId: Hex;
  player: Address;
  won: boolean;
}

/**
 * Preimage for `BattleshipLobby.claimDigest`. Matches the contract exactly:
 *   keccak256(abi.encode(CLAIM_TAG, chainid, address(this), matchId, winner))
 *     .toEthSignedMessageHash()
 *
 * Returned as the raw keccak256 — call `signer.signMessage({ message: { raw } })`
 * to apply the EIP-191 prefix and produce the final signature.
 */
export function claimHash(input: ClaimInput): Hex {
  return keccak256(
    encodeAbiParameters(CLAIM_PARAMS, [
      CLAIM_TAG,
      BigInt(input.chainId),
      input.lobbyAddress,
      input.matchId,
      input.winner,
    ]),
  );
}

export function resultHash(input: ResultInput): Hex {
  return keccak256(
    encodeAbiParameters(RESULT_PARAMS, [
      RESULT_TAG,
      BigInt(input.chainId),
      input.botMatchAddress,
      input.matchId,
      input.player,
      input.won,
    ]),
  );
}

export async function signClaim(signer: PrivateKeyAccount, input: ClaimInput): Promise<Hex> {
  const raw = claimHash(input);
  return signer.signMessage({ message: { raw } });
}

export async function signResult(signer: PrivateKeyAccount, input: ResultInput): Promise<Hex> {
  const raw = resultHash(input);
  return signer.signMessage({ message: { raw } });
}
