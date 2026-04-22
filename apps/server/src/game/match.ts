import { validateFleet, type FleetInput } from "./board";
import { BOARD_SIZE, type Coord, type Ship, type ShotOutcome } from "./types";

export type PlayerSide = "A" | "B";

interface SideState {
  fleet: Ship[] | null;
  shots: Set<string>; // cells this side has fired at
}

export interface MatchInit {
  matchId: `0x${string}`;
  stake: bigint;
  playerA: `0x${string}`;
  playerB: `0x${string}`;
}

export interface MatchResult {
  winner: `0x${string}`;
  loser: `0x${string}`;
}

export class Match {
  public readonly matchId: `0x${string}`;
  public readonly stake: bigint;
  public readonly playerA: `0x${string}`;
  public readonly playerB: `0x${string}`;

  private sides: Record<PlayerSide, SideState> = {
    A: { fleet: null, shots: new Set() },
    B: { fleet: null, shots: new Set() },
  };
  private turn: PlayerSide | null = null;
  private result: MatchResult | null = null;

  constructor(init: MatchInit) {
    this.matchId = init.matchId;
    this.stake = init.stake;
    this.playerA = init.playerA;
    this.playerB = init.playerB;
  }

  /** Register fleet for a side. Returns true if both sides have now placed. */
  placeFleet(side: PlayerSide, fleet: FleetInput[]): { ok: true; bothPlaced: boolean } | { ok: false; error: string } {
    if (this.sides[side].fleet) return { ok: false, error: "fleet already placed" };
    const res = validateFleet(fleet);
    if (!res.ok) return res;
    this.sides[side].fleet = res.ships;
    const bothPlaced = Boolean(this.sides.A.fleet && this.sides.B.fleet);
    if (bothPlaced && this.turn === null) {
      this.turn = Math.random() < 0.5 ? "A" : "B";
    }
    return { ok: true, bothPlaced };
  }

  /** Who fires next. Null until both fleets are placed. */
  getTurn(): PlayerSide | null {
    return this.turn;
  }

  /** Force the starting turn (test/deterministic use). */
  setTurnForTest(side: PlayerSide) {
    this.turn = side;
  }

  isFinished(): boolean {
    return this.result !== null;
  }

  getResult(): MatchResult | null {
    return this.result;
  }

  /** Apply a shot from `side` at `(row, col)` against the opponent's fleet. */
  fire(side: PlayerSide, row: number, col: number): { ok: true; outcome: ShotOutcome } | { ok: false; error: string } {
    if (this.result) return { ok: false, error: "match is finished" };
    if (this.turn !== side) return { ok: false, error: "not your turn" };
    if (!inBounds(row, col)) return { ok: false, error: "out of bounds" };

    const opponent: PlayerSide = side === "A" ? "B" : "A";
    const target = this.sides[opponent].fleet;
    if (!target) return { ok: false, error: "opponent fleet not placed" };

    const key = `${row},${col}`;
    if (this.sides[side].shots.has(key)) return { ok: false, error: "already fired at that cell" };
    this.sides[side].shots.add(key);

    let outcome: "miss" | "hit" | "sunk" = "miss";
    let sunkShipCells: Coord[] | undefined;
    for (const ship of target) {
      const idx = ship.cells.findIndex(([r, c]) => r === row && c === col);
      if (idx === -1) continue;
      ship.hits[idx] = true;
      if (ship.hits.every(Boolean)) {
        outcome = "sunk";
        sunkShipCells = ship.cells;
      } else {
        outcome = "hit";
      }
      break;
    }

    const allSunk = target.every((s) => s.hits.every(Boolean));
    if (allSunk) {
      this.result = side === "A"
        ? { winner: this.playerA, loser: this.playerB }
        : { winner: this.playerB, loser: this.playerA };
    } else if (outcome === "miss") {
      this.turn = opponent;
    }
    return { ok: true, outcome: { outcome, sunkShipCells, allSunk } };
  }
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}
