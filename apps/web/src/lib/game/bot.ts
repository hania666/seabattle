import { BOARD_SIZE, type Board, type Coord, type Difficulty } from "./types";

export interface BotMemory {
  /** Cells the bot has already fired at (any outcome). */
  shots: Set<string>;
  /** Queue of cells to try next when chasing a damaged ship. */
  chase: Coord[];
  /** Recent unsunk hits that anchor the chase. */
  anchors: Coord[];
}

export function createBotMemory(): BotMemory {
  return { shots: new Set(), chase: [], anchors: [] };
}

const key = (r: number, c: number) => `${r},${c}`;

/** Pick the bot's next shot. Pure function — randomness is injected. */
export function pickBotShot(
  _playerBoard: Board,
  memory: BotMemory,
  difficulty: Difficulty,
  random: () => number = Math.random,
): Coord {
  // 1. If we are chasing a hit, try queued neighbors first (all difficulties).
  while (memory.chase.length > 0) {
    const next = memory.chase.shift();
    if (!next) break;
    const [r, c] = next;
    if (!inBounds(r, c)) continue;
    if (memory.shots.has(key(r, c))) continue;
    return next;
  }

  // 2. Random targeting.
  const pool = buildTargetPool(_playerBoard, memory, difficulty);
  if (pool.length === 0) {
    // Fallback: any untried cell.
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (!memory.shots.has(key(r, c))) return [r, c];
      }
    }
    throw new Error("no cells left");
  }
  return pool[Math.floor(random() * pool.length)];
}

function buildTargetPool(
  _playerBoard: Board,
  memory: BotMemory,
  difficulty: Difficulty,
): Coord[] {
  const pool: Coord[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (memory.shots.has(key(r, c))) continue;

      if (difficulty >= 1) {
        // Normal/Hard: prefer the checkerboard parity of the smallest remaining
        // ship (size 2) so we cover the board in half the shots.
        if ((r + c) % 2 !== 0) continue;
      }

      if (difficulty === 2) {
        // Hard: bias toward high-probability cells. We approximate by preferring
        // central cells and cells with more unblocked neighbors.
        const central = 1 + (4 - Math.abs(4.5 - r)) + (4 - Math.abs(4.5 - c));
        for (let i = 0; i < central; i++) pool.push([r, c]);
        continue;
      }
      pool.push([r, c]);
    }
  }
  return pool;
}

/** Update memory after observing the outcome of a shot. */
export function rememberShot(
  memory: BotMemory,
  [r, c]: Coord,
  outcome: "miss" | "hit" | "sunk",
  _playerBoard: Board,
): BotMemory {
  const shots = new Set(memory.shots);
  shots.add(key(r, c));

  let chase = memory.chase.slice();
  let anchors = memory.anchors.slice();

  if (outcome === "hit") {
    anchors.push([r, c]);
    for (const n of orthogonalNeighbors(r, c)) {
      if (!memory.shots.has(key(n[0], n[1]))) chase.push(n);
    }
  } else if (outcome === "sunk") {
    // Clear chase; when a ship goes down no more follow-up needed.
    chase = [];
    anchors = [];
  }
  return { shots, chase, anchors };

  function orthogonalNeighbors(row: number, col: number): Coord[] {
    const all: Coord[] = [
      [row - 1, col],
      [row + 1, col],
      [row, col - 1],
      [row, col + 1],
    ];
    return all.filter(([nr, nc]) => inBounds(nr, nc));
  }
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}
