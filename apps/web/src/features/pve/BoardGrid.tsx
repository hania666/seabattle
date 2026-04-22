import { BOARD_SIZE, type Board, type Coord } from "../../lib/game/types";

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
  "data-testid"?: string;
}

const LABELS_COLS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

export function BoardGrid({ board, mode, onCellClick, disabled, highlight, ...rest }: Props) {
  const highlightSet = new Set(highlight?.map(([r, c]) => `${r},${c}`) ?? []);

  return (
    <div className="inline-block select-none" data-testid={rest["data-testid"]}>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `1.5rem repeat(${BOARD_SIZE}, minmax(1.75rem, 2.25rem))` }}
      >
        <div />
        {LABELS_COLS.map((c) => (
          <div key={c} className="text-center text-[11px] font-semibold text-sea-400">
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
}: {
  row: number;
  board: Board;
  mode: GridMode;
  onCellClick?: (row: number, col: number) => void;
  disabled?: boolean;
  highlightSet: Set<string>;
}) {
  return (
    <>
      <div className="pt-[3px] text-right text-[11px] font-semibold text-sea-400">{row + 1}</div>
      {Array.from({ length: BOARD_SIZE }, (_, c) => {
        const cell = board.cells[row][c];
        const isShip = cell.kind === "ship";
        const isHit = cell.kind === "hit";
        const isSunk = cell.kind === "sunk";
        const isMiss = cell.kind === "miss";
        const isHighlight = highlightSet.has(`${row},${c}`);

        const classes = cx(
          "aspect-square rounded-md border text-xs font-semibold transition",
          "border-sea-700/70 bg-sea-900/70",
          mode === "own" && isShip && "border-sea-400 bg-sea-600",
          isHit && "border-red-500 bg-red-500/30 text-red-200",
          isSunk && "border-red-600 bg-red-600/70 text-red-100",
          isMiss && "border-sea-600 bg-sea-700/40 text-sea-300",
          !disabled && mode === "attack" && !isHit && !isSunk && !isMiss && "hover:border-sea-300 hover:bg-sea-700",
          disabled && "cursor-not-allowed",
          isHighlight && "ring-2 ring-sea-300",
        );

        const content = isHit ? "×" : isSunk ? "✕" : isMiss ? "•" : "";
        const clickable = mode === "attack" && !disabled && !isHit && !isSunk && !isMiss;

        return (
          <button
            key={c}
            type="button"
            disabled={!clickable}
            onClick={() => clickable && onCellClick?.(row, c)}
            data-testid={`cell-${mode}-${row}-${c}`}
            className={classes}
            aria-label={`${LABELS_COLS[c]}${row + 1}`}
          >
            {content}
          </button>
        );
      })}
    </>
  );
}
