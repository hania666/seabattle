import { useMemo } from "react";
import { BOARD_SIZE, type Board, type Coord } from "../../lib/game/types";
import {
  HitCell,
  MissCell,
  ShipSegment,
  SunkCell,
  WaterCell,
  type SegmentOrientation,
} from "../art/CellArt";
import { ShotFX, type ShotOutcome } from "../art/ShotFX";

/**
 * One-shot FX overlay request: identifies a single shot the UI should
 * animate once. `ts` is the wall-clock timestamp the caller used to
 * schedule the entry — also used to expire it after the animation
 * window. `${row},${col},${ts}` doubles as the React key so the same
 * coord can re-trigger the animation on a repeat shot.
 */
export interface CellFx {
  row: number;
  col: number;
  outcome: ShotOutcome;
  ts: number;
}

function cx(...parts: Array<string | false | undefined | null>): string {
  return parts.filter(Boolean).join(" ");
}

type GridMode = "own" | "attack";

interface Props {
  board: Board;
  mode: GridMode;
  onCellClick?: (row: number, col: number) => void;
  disabled?: boolean;
  highlight?: Coord[];
  /** Ephemeral FX to play once on specific cells. */
  fx?: CellFx[];
  "data-testid"?: string;
}

const LABELS_COLS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

interface SegmentInfo {
  index: number;
  total: number;
  orientation: SegmentOrientation;
  sunk: boolean;
}

function buildSegmentMap(board: Board): Map<string, SegmentInfo> {
  const map = new Map<string, SegmentInfo>();
  for (const ship of board.ships) {
    const total = ship.cells.length;
    const orientation: SegmentOrientation =
      total > 1 && ship.cells[0][0] === ship.cells[1][0] ? "h" : "v";
    const sunk = ship.hits.every(Boolean);
    ship.cells.forEach((cell, i) => {
      map.set(`${cell[0]},${cell[1]}`, { index: i, total, orientation, sunk });
    });
  }
  return map;
}

export function BoardGrid({
  board,
  mode,
  onCellClick,
  disabled,
  highlight,
  fx,
  ...rest
}: Props) {
  const highlightSet = new Set(highlight?.map(([r, c]) => `${r},${c}`) ?? []);
  const segments = useMemo(() => buildSegmentMap(board), [board]);
  // Fold the fx array into a coord-keyed map so Row can render the
  // animation without scanning the list per cell.
  const fxMap = useMemo(() => {
    const m = new Map<string, CellFx>();
    fx?.forEach((f) => m.set(`${f.row},${f.col}`, f));
    return m;
  }, [fx]);

  return (
    <div
      className="mx-auto w-full max-w-fit select-none overflow-x-auto"
      data-testid={rest["data-testid"]}
      aria-label={mode === "own" ? "Your fleet board" : "Opponent board"}
    >
      <div
        className="grid gap-1 rounded-xl bg-sea-950/40 p-2 ring-1 ring-sea-700/40"
        style={{
          gridTemplateColumns: `1.25rem repeat(${BOARD_SIZE}, minmax(1.5rem, clamp(1.75rem, 7.5vw, 2.25rem)))`,
        }}
      >
        <div />
        {LABELS_COLS.map((c) => (
          <div
            key={c}
            className="text-center text-[11px] font-semibold text-sea-400"
            aria-hidden="true"
          >
            {c}
          </div>
        ))}
        {Array.from({ length: BOARD_SIZE }, (_, r) => (
          <Row
            key={r}
            row={r}
            board={board}
            mode={mode}
            onCellClick={onCellClick}
            disabled={disabled}
            highlightSet={highlightSet}
            segments={segments}
            fxMap={fxMap}
          />
        ))}
      </div>
    </div>
  );
}

function Row({
  row,
  board,
  mode,
  onCellClick,
  disabled,
  highlightSet,
  segments,
  fxMap,
}: {
  row: number;
  board: Board;
  mode: GridMode;
  onCellClick?: (row: number, col: number) => void;
  disabled?: boolean;
  highlightSet: Set<string>;
  segments: Map<string, SegmentInfo>;
  fxMap: Map<string, CellFx>;
}) {
  return (
    <>
      <div className="pt-[3px] text-right text-[11px] font-semibold text-sea-400" aria-hidden="true">
        {row + 1}
      </div>
      {Array.from({ length: BOARD_SIZE }, (_, c) => {
        const cell = board.cells[row][c];
        const isShip = cell.kind === "ship";
        const isHit = cell.kind === "hit";
        const isSunk = cell.kind === "sunk";
        const isMiss = cell.kind === "miss";
        const isEmpty = cell.kind === "empty";
        const isHighlight = highlightSet.has(`${row},${c}`);
        const seg = segments.get(`${row},${c}`);

        const classes = cx(
          "relative aspect-square overflow-hidden rounded-md border text-xs font-semibold transition",
          "border-sea-700/50 bg-gradient-to-br from-sea-900/80 to-sea-950/80",
          mode === "own" && isShip && "border-sea-400/60 from-sea-700 to-sea-900",
          isHit && "border-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.5)]",
          isSunk && "border-red-700 shadow-[0_0_16px_rgba(185,28,28,0.6)]",
          isMiss && "border-sea-400/50",
          !disabled &&
            mode === "attack" &&
            !isHit &&
            !isSunk &&
            !isMiss &&
            "hover:border-sea-300 hover:shadow-[0_0_12px_rgba(56,189,248,0.5)] active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-300",
          disabled && "cursor-not-allowed",
          isHighlight && "ring-2 ring-sea-300",
        );

        const clickable = mode === "attack" && !disabled && !isHit && !isSunk && !isMiss;
        const coord = `${LABELS_COLS[c]}${row + 1}`;
        const state = isSunk
          ? "sunk"
          : isHit
            ? "hit"
            : isMiss
              ? "miss"
              : mode === "own" && isShip
                ? "ship"
                : "empty";

        return (
          <button
            key={c}
            type="button"
            disabled={!clickable}
            onClick={() => clickable && onCellClick?.(row, c)}
            data-testid={`cell-${mode}-${row}-${c}`}
            className={classes}
            aria-label={`${coord} — ${state}`}
          >
            {/* Layer 1: water on unknown/empty attack cells */}
            {mode === "attack" && isEmpty && <WaterCell />}
            {/* Layer 2: ship silhouette on the player's own board */}
            {mode === "own" && isShip && seg && (
              <ShipSegment index={seg.index} total={seg.total} orientation={seg.orientation} />
            )}
            {/* Sunk ships on own board: keep the hull but tinted red */}
            {mode === "own" && isSunk && seg && (
              <ShipSegment
                index={seg.index}
                total={seg.total}
                orientation={seg.orientation}
                sunk
              />
            )}
            {/* Attack-side sunk: show burning ship fragment */}
            {mode === "attack" && isSunk && <SunkCell />}
            {/* FX layers on top */}
            {isMiss && <MissCell />}
            {isHit && <HitCell />}
            {(() => {
              const f = fxMap.get(`${row},${c}`);
              return f ? (
                <ShotFX key={`${f.row},${f.col},${f.ts}`} outcome={f.outcome} />
              ) : null;
            })()}
          </button>
        );
      })}
    </>
  );
}
