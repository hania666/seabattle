import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { createBotMemory, pickBotShot, rememberShot, type BotMemory } from "../../lib/game/bot";
import { randomFleet } from "../../lib/game/board";
import { allShipsSunk, fireShot, openCells, publicView } from "../../lib/game/shots";
import { type Board, type Coord, type Difficulty } from "../../lib/game/types";
import { DIFFICULTY_LABELS } from "../../lib/game/types";
import { sfx } from "../../lib/audio";
import { useT } from "../../lib/i18n";
import {
  consumePowerup,
  loadPowerupState,
  type PowerupState,
} from "../../lib/powerups";
import { markIf } from "../../lib/achievements";
import { FleetRoster } from "../../components/FleetRoster";
import { BoardGrid, type CellFx } from "./BoardGrid";
import { TurnTimer } from "./TurnTimer";
import { BombArc } from "../art/BombArc";

export interface PveFinishStats {
  playerShots: number;
  botShots: number;
  powerupsUsed: boolean;
  durationMs: number;
  firstSunkEmitted: boolean;
}

interface Props {
  difficulty: Difficulty;
  playerBoard: Board;
  onFinished: (won: boolean, stats: PveFinishStats) => void;
}

type Turn = "player" | "bot";

interface LogEntry {
  side: Turn;
  coord: Coord;
  outcome: "miss" | "hit" | "sunk";
  auto?: boolean;
  powerup?: "bomb" | "radar";
}

const FX_LIFETIME_MS = 900;

type AimMode = "shot" | "bomb" | "radar";

const TURN_SECONDS = 30;
const COLS = "ABCDEFGHIJ";

export function GameBoard({ difficulty, playerBoard, onFinished }: Props) {
  const t = useT();
  const { address } = useAccount();
  const [myBoard, setMyBoard] = useState<Board>(playerBoard);
  const [enemyBoard, setEnemyBoard] = useState<Board>(() => randomFleet());
  const [turn, setTurn] = useState<Turn>("player");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [playerShots, setPlayerShots] = useState(0);
  const [botShots, setBotShots] = useState(0);
  const [aim, setAim] = useState<AimMode>("shot");
  const [powerups, setPowerups] = useState<PowerupState>(() => loadPowerupState(address));
  const [radarFlash, setRadarFlash] = useState<null | { n: number }>(null);
  // Ephemeral per-cell shot FX. We prune entries after the animation window.
  const [enemyFx, setEnemyFx] = useState<CellFx[]>([]);
  const [myFx, setMyFx] = useState<CellFx[]>([]);
  // Bomb arc overlay targets (one per 3x3 strike). Cleared after landing.
  const [bombArc, setBombArc] = useState<{ row: number; col: number; ts: number } | null>(null);
  const botMemory = useRef<BotMemory>(createBotMemory());
  const finished = useRef(false);
  const startedAt = useRef(Date.now());
  const powerupsUsed = useRef(false);
  const firstSunkEmitted = useRef(false);

  // Drop expired FX entries — keeps the prop array tight and allows a
  // future shot at the same coord to mount a fresh animation.
  useEffect(() => {
    if (enemyFx.length === 0 && myFx.length === 0) return;
    const tm = setTimeout(() => {
      const cutoff = Date.now() - FX_LIFETIME_MS;
      setEnemyFx((xs) => xs.filter((f) => f.ts > cutoff));
      setMyFx((xs) => xs.filter((f) => f.ts > cutoff));
    }, FX_LIFETIME_MS);
    return () => clearTimeout(tm);
  }, [enemyFx, myFx]);

  function pushEnemyFx(row: number, col: number, outcome: "miss" | "hit" | "sunk") {
    setEnemyFx((xs) => [
      ...xs.filter((f) => !(f.row === row && f.col === col)),
      { row, col, outcome, ts: Date.now() + Math.random() },
    ]);
  }
  function pushMyFx(row: number, col: number, outcome: "miss" | "hit" | "sunk") {
    setMyFx((xs) => [
      ...xs.filter((f) => !(f.row === row && f.col === col)),
      { row, col, outcome, ts: Date.now() + Math.random() },
    ]);
  }

  useEffect(() => {
    function refresh() {
      setPowerups(loadPowerupState(address));
    }
    refresh();
    window.addEventListener("powerups:updated", refresh);
    return () => window.removeEventListener("powerups:updated", refresh);
  }, [address]);

  const finalize = useCallback(
    (won: boolean, shotsP: number, shotsB: number) => {
      finished.current = true;
      setTimeout(() => (won ? sfx.victory() : sfx.defeat()), 400);
      onFinished(won, {
        playerShots: shotsP,
        botShots: shotsB,
        powerupsUsed: powerupsUsed.current,
        durationMs: Date.now() - startedAt.current,
        firstSunkEmitted: firstSunkEmitted.current,
      });
    },
    [onFinished],
  );

  const fireAtCell = useCallback(
    (board: Board, r: number, c: number): { board: Board; outcome: "miss" | "hit" | "sunk" | "already" } => {
      const res = fireShot(board, r, c);
      return { board: res.board, outcome: res.outcome };
    },
    [],
  );

  const handleAttack = useCallback(
    (row: number, col: number, auto = false) => {
      if (turn !== "player" || finished.current) return;

      // Radar: don't consume a shot, don't end turn, don't mark cells.
      if (aim === "radar") {
        if (powerups.inventory.radar <= 0) return;
        consumePowerup(address, "radar");
        powerupsUsed.current = true;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const rr = row + dr;
            const cc = col + dc;
            if (rr < 0 || rr > 9 || cc < 0 || cc > 9) continue;
            const cell = enemyBoard.cells[rr][cc];
            if (cell.kind === "ship") count++;
          }
        }
        sfx.click();
        setRadarFlash({ n: count });
        setTimeout(() => setRadarFlash(null), 2600);
        setLog((l) => [
          ...l,
          { side: "player", coord: [row, col], outcome: count > 0 ? "hit" : "miss", powerup: "radar" },
        ]);
        setAim("shot");
        setPowerups(loadPowerupState(address));
        return;
      }

      // Bomb: 3×3 strike. Fires multiple shots and always ends your turn.
      if (aim === "bomb") {
        if (powerups.inventory.bomb <= 0) return;
        consumePowerup(address, "bomb");
        powerupsUsed.current = true;
        // Launch the projectile animation first, then resolve damage after
        // it lands so the explosion and FX read as one event.
        setBombArc({ row, col, ts: Date.now() });
        setTimeout(() => setBombArc(null), 900);
        let board = enemyBoard;
        let sunks = 0;
        const newEntries: LogEntry[] = [];
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const rr = row + dr;
            const cc = col + dc;
            if (rr < 0 || rr > 9 || cc < 0 || cc > 9) continue;
            const res = fireAtCell(board, rr, cc);
            if (res.outcome === "already") continue;
            board = res.board;
            if (res.outcome === "sunk") {
              sunks++;
              if (!firstSunkEmitted.current) {
                firstSunkEmitted.current = true;
                markIf(address, "firstBlood", true);
              }
            }
            newEntries.push({
              side: "player",
              coord: [rr, cc],
              outcome: res.outcome as "miss" | "hit" | "sunk",
              powerup: "bomb",
            });
            pushEnemyFx(rr, cc, res.outcome as "miss" | "hit" | "sunk");
          }
        }
        setEnemyBoard(board);
        const nextShots = playerShots + newEntries.length;
        setPlayerShots(nextShots);
        setLog((l) => [...l, ...newEntries]);
        sfx.shot();
        setTimeout(() => sfx.hit(), 150);
        if (sunks > 0) setTimeout(() => sfx.sunk(), 400);
        setAim("shot");
        setPowerups(loadPowerupState(address));
        if (allShipsSunk(board)) {
          finalize(true, nextShots, botShots);
          return;
        }
        setTurn("bot");
        return;
      }

      // Regular shot.
      const result = fireShot(enemyBoard, row, col);
      if (result.outcome === "already") return;
      setEnemyBoard(result.board);
      setPlayerShots((n) => n + 1);
      setLog((l) => [
        ...l,
        { side: "player", coord: [row, col], outcome: result.outcome as "miss" | "hit" | "sunk", auto },
      ]);
      pushEnemyFx(row, col, result.outcome as "miss" | "hit" | "sunk");
      sfx.shot();
      if (result.outcome === "miss") setTimeout(() => sfx.miss(), 120);
      else if (result.outcome === "hit") setTimeout(() => sfx.hit(), 120);
      else if (result.outcome === "sunk") setTimeout(() => sfx.sunk(), 120);
      if (result.outcome === "sunk" && !firstSunkEmitted.current) {
        firstSunkEmitted.current = true;
        markIf(address, "firstBlood", true);
      }
      if (allShipsSunk(result.board)) {
        finalize(true, playerShots + 1, botShots);
        return;
      }
      if (result.outcome === "miss") setTurn("bot");
    },
    [turn, aim, enemyBoard, playerShots, botShots, finalize, powerups, address, fireAtCell],
  );

  const handlePlayerTimeout = useCallback(() => {
    if (turn !== "player" || finished.current) return;
    setAim("shot");
    const open = openCells(enemyBoard);
    if (open.length === 0) return;
    const pick = open[Math.floor(Math.random() * open.length)];
    handleAttack(pick[0], pick[1], true);
  }, [turn, enemyBoard, handleAttack]);

  useEffect(() => {
    if (turn !== "bot" || finished.current) return;
    const timer = setTimeout(() => {
      const shot = pickBotShot(myBoard, botMemory.current, difficulty);
      const result = fireShot(myBoard, shot[0], shot[1]);
      if (result.outcome === "already") return;
      setMyBoard(result.board);
      setBotShots((n) => n + 1);
      setLog((l) => [
        ...l,
        { side: "bot", coord: shot, outcome: result.outcome as "miss" | "hit" | "sunk" },
      ]);
      pushMyFx(shot[0], shot[1], result.outcome as "miss" | "hit" | "sunk");
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
        finalize(false, playerShots, botShots + 1);
        return;
      }
      if (result.outcome === "miss") setTurn("player");
    }, 700);
    return () => clearTimeout(timer);
  }, [turn, myBoard, difficulty, botShots, playerShots, finalize]);

  const yourTurn = turn === "player";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-sea-50">
            {t("pve.playing")}{" "}
            <span className="text-sea-300">{DIFFICULTY_LABELS[difficulty]}</span>
          </h2>
          <p className="text-sm text-sea-300">{t("pve.intro")}</p>
        </div>
        <div className="flex items-center gap-3">
          <TurnTimer
            active={yourTurn && !finished.current}
            seconds={TURN_SECONDS}
            label={yourTurn ? t("pve.yourTurn") : t("pve.botThinking")}
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
            {yourTurn ? t("pve.yourShot") : t("pve.botThinking")}
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_14rem]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-lg text-sea-100">Enemy waters</h3>
            {aim !== "shot" && (
              <button
                type="button"
                onClick={() => setAim("shot")}
                className="rounded-full bg-coral-500/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-coral-200 ring-1 ring-coral-400/50 hover:bg-coral-500/30"
              >
                {t("pu.cancel")}
              </button>
            )}
          </div>
          {aim !== "shot" && (
            <div
              role="status"
              className="mb-2 rounded-xl bg-gold-500/15 px-3 py-2 text-xs font-semibold text-gold-200 ring-1 ring-gold-400/40"
            >
              {aim === "bomb" ? t("pu.aim.bomb") : t("pu.aim.radar")}
            </div>
          )}
          {radarFlash && (
            <div
              role="status"
              className="mb-2 animate-fade-in rounded-xl bg-sea-500/20 px-3 py-2 text-xs font-semibold text-sea-100 ring-1 ring-sea-400/50"
            >
              {radarFlash.n > 0 ? t("pu.radarResult", { n: radarFlash.n }) : t("pu.radarClear")}
            </div>
          )}
          <div className="relative">
            <BoardGrid
              board={publicView(enemyBoard)}
              mode="attack"
              onCellClick={(r, c) => handleAttack(r, c, false)}
              disabled={!yourTurn}
              fx={enemyFx}
              data-testid="board-enemy"
            />
            {bombArc && (
              <BombArc key={bombArc.ts} row={bombArc.row} col={bombArc.col} />
            )}
          </div>
          <div className="mt-2 text-xs text-sea-400">
            Your shots: <strong className="text-sea-200">{playerShots}</strong>
          </div>
          <PowerupBar
            active={yourTurn}
            state={powerups}
            selected={aim === "shot" ? null : aim}
            onPick={(id) => {
              if (!yourTurn) return;
              setAim((prev) => (prev === id ? "shot" : id));
              sfx.click();
            }}
          />
        </section>

        <aside className="space-y-4">
          <FleetRoster board={enemyBoard} side="enemy" revealOnlyWhenSunk />
          <FleetRoster board={myBoard} side="self" />
        </aside>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg text-sea-100">Your fleet</h3>
        </div>
        <BoardGrid board={myBoard} mode="own" disabled fx={myFx} data-testid="board-own" />
        <p className="mt-2 text-xs text-sea-400">
          Bot shots: <strong className="text-sea-200">{botShots}</strong>
        </p>
      </section>

      <Log log={log} />
    </div>
  );
}

function PowerupBar({
  active,
  state,
  selected,
  onPick,
}: {
  active: boolean;
  state: PowerupState;
  selected: "bomb" | "radar" | null;
  onPick: (id: "bomb" | "radar") => void;
}) {
  const t = useT();
  const bomb = state.inventory.bomb;
  const radar = state.inventory.radar;
  const torpedo = state.inventory.torpedo;
  const shield = state.inventory.shield;
  const any = bomb + radar > 0;
  return (
    <div className="mt-3 rounded-2xl border border-sea-800/70 bg-sea-950/50 p-3">
      <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-sea-300">
        <span className="font-semibold">{t("pu.title")}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <PwChip
          icon="💣"
          label="Bomb"
          count={bomb}
          active={active && bomb > 0}
          selected={selected === "bomb"}
          onClick={() => bomb > 0 && onPick("bomb")}
          testId="pu-bomb"
        />
        <PwChip
          icon="📡"
          label="Radar"
          count={radar}
          active={active && radar > 0}
          selected={selected === "radar"}
          onClick={() => radar > 0 && onPick("radar")}
          testId="pu-radar"
        />
        <PwChip
          icon="🚀"
          label="Torpedo"
          count={torpedo}
          active={false}
          selected={false}
          onClick={() => undefined}
          note={t("pu.locked.soon")}
          testId="pu-torpedo"
        />
        <PwChip
          icon="🛡"
          label="Shield"
          count={shield}
          active={false}
          selected={false}
          onClick={() => undefined}
          note={t("pu.locked.pvp")}
          testId="pu-shield"
        />
      </div>
      {!any && (
        <p className="mt-2 text-[11px] text-sea-400">{t("pu.none")}</p>
      )}
    </div>
  );
}

function PwChip({
  icon,
  label,
  count,
  active,
  selected,
  onClick,
  note,
  testId,
}: {
  icon: string;
  label: string;
  count: number;
  active: boolean;
  selected: boolean;
  onClick: () => void;
  note?: string;
  testId: string;
}) {
  const disabled = !active;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={`group relative inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
        selected
          ? "bg-gradient-to-br from-gold-300 to-gold-500 text-sea-950 shadow-glow-gold ring-2 ring-gold-200"
          : disabled
            ? "cursor-not-allowed bg-sea-900/40 text-sea-400 ring-1 ring-sea-800/60"
            : "bg-sea-800/70 text-sea-100 ring-1 ring-sea-600/60 hover:bg-sea-700/70 hover:ring-sea-400/60"
      }`}
      aria-pressed={selected}
    >
      <span className="text-lg leading-none" aria-hidden>
        {icon}
      </span>
      <span className="uppercase tracking-wide">{label}</span>
      <span
        className={`rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
          selected
            ? "bg-sea-950/30 text-sea-950"
            : count > 0
              ? "bg-gold-500/20 text-gold-300"
              : "bg-sea-900 text-sea-500"
        }`}
      >
        ×{count}
      </span>
      {note && (
        <span className="ml-1 text-[10px] uppercase tracking-wider text-sea-400 group-hover:text-sea-300">
          · {note}
        </span>
      )}
    </button>
  );
}

function Log({ log }: { log: LogEntry[] }) {
  if (log.length === 0) return null;
  const recent = log.slice(-10).reverse();
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
            {e.powerup && (
              <span className="ml-2 text-[10px] uppercase text-gold-300">
                · {e.powerup}
              </span>
            )}
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
