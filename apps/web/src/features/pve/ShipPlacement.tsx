import { useMemo, useState } from "react";
import {
  canPlaceShip,
  createEmptyBoard,
  isFleetComplete,
  placeShip,
  randomFleet,
  shipCells,
} from "../../lib/game/board";
import type { Board, Orientation, ShipKind } from "../../lib/game/types";
import { FLEET } from "../../lib/game/types";
import { BoardGrid } from "./BoardGrid";

interface Props {
  onReady: (board: Board) => void;
  onBack: () => void;
}

export function ShipPlacement({ onReady, onBack }: Props) {
  const [board, setBoard] = useState<Board>(() => randomFleet());
  const [shipIdx, setShipIdx] = useState<number>(FLEET.length);
  const [orientation, setOrientation] = useState<Orientation>("horizontal");
  const [hover, setHover] = useState<{ row: number; col: number } | null>(null);

  const placingKind: ShipKind | null = shipIdx < FLEET.length ? FLEET[shipIdx].kind : null;
  const placingSize = shipIdx < FLEET.length ? FLEET[shipIdx].size : 0;

  const preview = useMemo(() => {
    if (!hover || !placingKind) return null;
    const cells = shipCells(hover.row, hover.col, placingSize, orientation);
    const valid = canPlaceShip(board, cells);
    return { cells, valid };
  }, [hover, placingKind, placingSize, orientation, board]);

  const highlight = preview?.cells.filter(([r, c]) => r >= 0 && r < 10 && c >= 0 && c < 10);

  function handleRandomize() {
    setBoard(randomFleet());
    setShipIdx(FLEET.length);
  }

  function handleClear() {
    setBoard(createEmptyBoard());
    setShipIdx(0);
    setOrientation("horizontal");
  }

  function handleCellClick(row: number, col: number) {
    if (!placingKind) return;
    const cells = shipCells(row, col, placingSize, orientation);
    if (!canPlaceShip(board, cells)) return;
    setBoard(placeShip(board, placingKind, cells));
    setShipIdx((i) => i + 1);
  }

  const ready = isFleetComplete(board);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl text-sea-50">Place your fleet</h2>
          <p className="text-sm text-sea-300">Click a cell to drop the next ship. Ships can't touch.</p>
        </div>
        <div className="flex gap-2 text-sm">
          <button
            onClick={handleRandomize}
            className="rounded-lg bg-sea-700 px-3 py-1.5 font-semibold text-sea-50 hover:bg-sea-600"
          >
            Randomize
          </button>
          <button
            onClick={handleClear}
            className="rounded-lg border border-sea-700 px-3 py-1.5 font-semibold text-sea-200 hover:bg-sea-800"
          >
            Clear
          </button>
        </div>
      </header>

      <div className="grid gap-8 md:grid-cols-[auto_1fr]">
        <div
          onMouseLeave={() => setHover(null)}
          onMouseOver={(e) => {
            const target = e.target as HTMLElement;
            const btn = target.closest<HTMLButtonElement>("[data-testid^=cell-own-]");
            if (!btn) return;
            const [, , rStr, cStr] = btn.dataset.testid!.split("-");
            setHover({ row: Number(rStr), col: Number(cStr) });
          }}
        >
          <BoardGrid
            board={board}
            mode="own"
            onCellClick={handleCellClick}
            highlight={highlight}
          />
          <p className="mt-2 text-xs text-sea-400">
            Orientation:{" "}
            <button
              onClick={() =>
                setOrientation((o) => (o === "horizontal" ? "vertical" : "horizontal"))
              }
              className="rounded bg-sea-800 px-2 py-0.5 font-semibold text-sea-100 hover:bg-sea-700"
            >
              {orientation} (press to flip)
            </button>
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="font-display text-lg text-sea-100">Fleet</h3>
          <ul className="space-y-2 text-sm">
            {FLEET.map((spec, i) => {
              const placed = i < shipIdx;
              const current = i === shipIdx;
              return (
                <li
                  key={spec.kind}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                    current
                      ? "border-sea-300 bg-sea-800"
                      : placed
                        ? "border-sea-700 bg-sea-900/60 text-sea-400"
                        : "border-sea-700/60 bg-sea-900/40"
                  }`}
                >
                  <span className="font-semibold">{spec.label}</span>
                  <span>{"█".repeat(spec.size)}</span>
                  {placed && <span className="text-xs">placed</span>}
                  {current && <span className="text-xs text-sea-200">placing…</span>}
                </li>
              );
            })}
          </ul>
          <div className="flex gap-2 pt-2">
            <button
              onClick={onBack}
              className="flex-1 rounded-lg border border-sea-700 px-4 py-2 text-sm font-semibold text-sea-200 hover:bg-sea-800"
            >
              Back
            </button>
            <button
              disabled={!ready}
              onClick={() => onReady(board)}
              data-testid="placement-ready"
              className="flex-1 rounded-lg bg-sea-300 px-4 py-2 text-sm font-semibold text-sea-950 transition hover:bg-sea-200 disabled:cursor-not-allowed disabled:bg-sea-700 disabled:text-sea-400"
            >
              {ready ? "Fleet ready →" : "Place all ships"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


