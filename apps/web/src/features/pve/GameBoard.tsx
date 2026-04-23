import { useCallback, useEffect, useRef, useState } from "react";
import { createBotMemory, pickBotShot, rememberShot, type BotMemory } from "../../lib/game/bot";
import { randomFleet } from "../../lib/game/board";
import { allShipsSunk, fireShot, openCells, publicView } from "../../lib/game/shots";
import { type Board, type Coord, type Difficulty } from "../../lib/game/types";
import { DIFFICULTY_LABELS } from "../../lib/game/types";
import { sfx } from "../../lib/audio";
import { BoardGrid } from "./BoardGrid";
import { TurnTimer } from "./TurnTimer";

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
  auto?: boolean;
}

const TURN_SECONDS = 30;
const COLS = "ABCDEFGHIJ";

export function GameBoard({ difficulty, playerBoard, onFinished }: Props) {
  const [myBoard, setMyBoard] = useState<Board>(playerBoard);
  const [enemyBoard, setEnemyBoard] = useState<Board>(() => randomFleet());
  const [turn, setTurn] = useState<Turn>("player");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [playerShots, setPlayerShots] = useState(0);
  const [botShots, setBotShots] = useState(0);
  const [totalAfloat, setTotalAfloat] = useState({ player: 5, enemy: 5 });
  const botMemory = useRef<BotMemory>(createBotMemory());
  const finished = useRef(false);

  useEffect(() => {
    // Recompute the "afloat" counters whenever a board mutates.
    const playerSunk = myBoard.ships.filter((s) => s.hits.every(Boolean)).length;
    const enemySunk = enemyBoard.ships.filter((s) => s.hits.every(Boolean)).length;
    setTotalAfloat({
      player: myBoard.ships.length - playerSunk,
      enemy: enemyBoard.ships.length - enemySunk,
    });
  }, [myBoard, enemyBoard]);

  const handleAttack = useCallback(
    (row: number, col: number, auto = false) => {
      if (turn !== "player" || finished.current) return;
      const result = fireShot(enemyBoard, row, col);
      if (result.outcome === "already") return;
      setEnemyBoard(result.board);
      setPlayerShots((n) => n + 1);
      setLog((l) => [
        ...l,
        { side: "player", coord: [row, col], outcome: result.outcome as "miss" | "hit" | "sunk", auto },
      ]);
      sfx.shot();
      if (result.outcome === "miss") setTimeout(() => sfx.miss(), 120);
      else if (result.outcome === "hit") setTimeout(() => sfx.hit(), 120);
      else if (result.outcome === "sunk") setTimeout(() => sfx.sunk(), 120);
      if (allShipsSunk(result.board)) {
        finished.current = true;
        setTimeout(() => sfx.victory(), 400);
        onFinished(true, { playerShots: playerShots + 1, botShots });
        return;
      }
      if (result.outcome === "miss") setTurn("bot");
    },
    [turn, enemyBoard, playerShots, botShots, onFinished],
  );

  const handlePlayerTimeout = useCallback(() => {
    if (turn !== "player" || finished.current) return;
    // Pick any untried cell — both water and hidden ship cells qualify, so a
    // timeout can still land a hit (just without any targeting skill).
    const open = openCells(enemyBoard);
    if (open.length === 0) return;
    const pick = open[Math.floor(Math.random() * open.length)];
    handleAttack(pick[0], pick[1], true);
  }, [turn, enemyBoard, handleAttack]);

  useEffect(() => {
    if (turn !== "bot" || finished.current) return;
    const t = setTimeout(() => {
      const shot = pickBotShot(myBoard, botMemory.current, difficulty);
      const result = fireShot(myBoard, shot[0], shot[1]);
      if (result.outcome === "already") return;
      setMyBoard(result.board);
      setBotShots((n) => n + 1);
      setLog((l) => [
        ...l,
        { side: "bot", coord: shot, outcome: result.outcome as "miss" | "hit" | "sunk" },
      ]);
      if (result.outcome === "miss") sfx.miss();
      else if (result.outcome === "hit") sfx.hit();
      else if (result.outcome === "sunk") sfx.sunk();
      botMemory.current = rememberShot(
        botMemory.current,
        shot,
        result.outcome as "miss" | "hit" | "sunk",
        result.board,
      );
      if (allShipsSunk(result.board)) {
        finished.current = true;
        setTimeout(() => sfx.defeat(), 400);
        onFinished(false, { playerShots, botShots: botShots + 1 });
        return;
      }
      if (result.outcome === "miss") setTurn("player");
    }, 700);
    return () => clearTimeout(t);
  }, [turn, myBoard, difficulty, botShots, playerShots, onFinished]);

  const yourTurn = turn === "player";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-sea-50">
            Playing <span className="text-sea-300">{DIFFICULTY_LABELS[difficulty]}</span> bot
          </h2>
          <p className="text-sm text-sea-300">
            Hit to keep firing. Miss and the bot gets its turn. Don't run out of time.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TurnTimer
            active={yourTurn && !finished.current}
            seconds={TURN_SECONDS}
            label={yourTurn ? "Your turn" : "Bot thinking…"}
            onExpire={handlePlayerTimeout}
            resetKey={`${playerShots}-${botShots}-${turn}`}
          />
          <div
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ring-1 ${
              yourTurn
                ? "bg-gradient-to-r from-sea-400 to-sea-500 text-sea-950 shadow-glow ring-sea-300/60"
                : "bg-sea-900/60 text-sea-200 ring-sea-700/60"
            }`}
            data-testid="turn-indicator"
          >
            {yourTurn ? "Your shot" : "Bot thinking…"}
          </div>
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-lg text-sea-100">Enemy waters</h3>
            <span className="text-xs font-semibold text-sea-300">
              Afloat: <strong className="text-sea-100">{totalAfloat.enemy}/5</strong>
            </span>
          </div>
          <BoardGrid
            board={publicView(enemyBoard)}
            mode="attack"
            onCellClick={(r, c) => handleAttack(r, c, false)}
            disabled={!yourTurn}
            data-testid="board-enemy"
          />
          <p className="mt-2 text-xs text-sea-400">
            Your shots: <strong className="text-sea-200">{playerShots}</strong>
          </p>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-lg text-sea-100">Your fleet</h3>
            <span className="text-xs font-semibold text-sea-300">
              Afloat: <strong className="text-sea-100">{totalAfloat.player}/5</strong>
            </span>
          </div>
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
                  ? "text-orange-300"
                  : e.outcome === "sunk"
                    ? "font-semibold text-red-400"
                    : "text-sea-400"
              }
            >
              {e.outcome}
            </span>
            {e.auto && <span className="ml-2 text-[10px] uppercase text-sea-500">auto</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function format(coord: Coord): string {
  return `${COLS[coord[1]]}${coord[0] + 1}`;
}
