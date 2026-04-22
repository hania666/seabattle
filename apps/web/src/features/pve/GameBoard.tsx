import { useEffect, useRef, useState } from "react";
import { createBotMemory, pickBotShot, rememberShot, type BotMemory } from "../../lib/game/bot";
import { randomFleet } from "../../lib/game/board";
import { allShipsSunk, fireShot, publicView } from "../../lib/game/shots";
import type { Board, Coord, Difficulty } from "../../lib/game/types";
import { DIFFICULTY_LABELS } from "../../lib/game/types";
import { BoardGrid } from "./BoardGrid";

interface Props {
  difficulty: Difficulty;
  playerBoard: Board;
  onFinished: (won: boolean, stats: { playerShots: number; botShots: number }) => void;
}

type Turn = "player" | "bot";

interface LogEntry {
  side: Turn;
  coord: Coord;
  outcome: "miss" | "hit" | "sunk";
}

export function GameBoard({ difficulty, playerBoard, onFinished }: Props) {
  const [myBoard, setMyBoard] = useState<Board>(playerBoard);
  const [enemyBoard, setEnemyBoard] = useState<Board>(() => randomFleet());
  const [turn, setTurn] = useState<Turn>("player");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [playerShots, setPlayerShots] = useState(0);
  const [botShots, setBotShots] = useState(0);
  const botMemory = useRef<BotMemory>(createBotMemory());
  const finished = useRef(false);

  useEffect(() => {
    if (turn !== "bot" || finished.current) return;
    const t = setTimeout(() => {
      const shot = pickBotShot(myBoard, botMemory.current, difficulty);
      const result = fireShot(myBoard, shot[0], shot[1]);
      if (result.outcome === "already") return;
      setMyBoard(result.board);
      setBotShots((n) => n + 1);
      setLog((l) => [...l, { side: "bot", coord: shot, outcome: result.outcome as "miss" | "hit" | "sunk" }]);
      botMemory.current = rememberShot(
        botMemory.current,
        shot,
        result.outcome as "miss" | "hit" | "sunk",
        result.board,
      );
      if (allShipsSunk(result.board)) {
        finished.current = true;
        onFinished(false, { playerShots, botShots: botShots + 1 });
        return;
      }
      // Bot keeps firing on hit/sunk, otherwise hands turn back.
      if (result.outcome === "miss") setTurn("player");
    }, 700);
    return () => clearTimeout(t);
  }, [turn, myBoard, difficulty, botShots, playerShots, onFinished]);

  function handleAttack(row: number, col: number) {
    if (turn !== "player" || finished.current) return;
    const result = fireShot(enemyBoard, row, col);
    if (result.outcome === "already") return;
    setEnemyBoard(result.board);
    setPlayerShots((n) => n + 1);
    setLog((l) => [...l, { side: "player", coord: [row, col], outcome: result.outcome as "miss" | "hit" | "sunk" }]);
    if (allShipsSunk(result.board)) {
      finished.current = true;
      onFinished(true, { playerShots: playerShots + 1, botShots });
      return;
    }
    if (result.outcome === "miss") setTurn("bot");
  }

  const turnLabel = turn === "player" ? "Your shot" : "Bot thinking…";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-sea-50">
            Playing <span className="text-sea-300">{DIFFICULTY_LABELS[difficulty]}</span> bot
          </h2>
          <p className="text-sm text-sea-300">
            Hit to keep firing. Miss and the bot gets its turn.
          </p>
        </div>
        <div
          className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
            turn === "player" ? "bg-sea-300 text-sea-950" : "bg-sea-800 text-sea-200"
          }`}
          data-testid="turn-indicator"
        >
          {turnLabel}
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-2">
        <section>
          <h3 className="mb-3 font-display text-lg text-sea-100">Enemy waters</h3>
          <BoardGrid
            board={publicView(enemyBoard)}
            mode="attack"
            onCellClick={handleAttack}
            disabled={turn !== "player"}
            data-testid="board-enemy"
          />
          <p className="mt-2 text-xs text-sea-400">
            Your shots: <strong className="text-sea-200">{playerShots}</strong>
          </p>
        </section>

        <section>
          <h3 className="mb-3 font-display text-lg text-sea-100">Your fleet</h3>
          <BoardGrid board={myBoard} mode="own" disabled data-testid="board-own" />
          <p className="mt-2 text-xs text-sea-400">
            Bot shots: <strong className="text-sea-200">{botShots}</strong>
          </p>
        </section>
      </div>

      <Log log={log} />
    </div>
  );
}

function Log({ log }: { log: LogEntry[] }) {
  if (log.length === 0) return null;
  const recent = log.slice(-8).reverse();
  return (
    <div className="rounded-xl border border-sea-700/60 bg-sea-900/50 p-4 text-xs text-sea-300">
      <div className="mb-1 font-semibold uppercase tracking-wide text-sea-400">Log</div>
      <ul className="space-y-0.5">
        {recent.map((e, i) => (
          <li key={i}>
            <span className={e.side === "player" ? "text-sea-100" : "text-sea-300"}>
              {e.side === "player" ? "You" : "Bot"}
            </span>
            : {format(e.coord)} —{" "}
            <span
              className={
                e.outcome === "hit"
                  ? "text-red-300"
                  : e.outcome === "sunk"
                    ? "font-semibold text-red-400"
                    : "text-sea-400"
              }
            >
              {e.outcome}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function format(coord: Coord): string {
  const cols = "ABCDEFGHIJ";
  return `${cols[coord[1]]}${coord[0] + 1}`;
}
