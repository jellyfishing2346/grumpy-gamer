// Pure helpers for the prediction markets page (issue #230).

export type Pick = "a" | "b" | "draw";
export type Cell = 0 | 1 | 2; // 0 empty, 1 bot A, 2 bot B

export interface ArenaMove {
  player: "a" | "b";
  move: number | [number, number]; // Connect Four column, or Tic-Tac-Toe [row, col]
}

const SIZES: Record<string, [number, number]> = {
  tictactoe: [3, 3],
  connectfour: [6, 7],
};

/** Board after the first `step` moves have been played. */
export function boardAfter(game: string, moves: ArenaMove[], step: number): Cell[][] {
  const [rows, cols] = SIZES[game] ?? [3, 3];
  const board: Cell[][] = Array.from({ length: rows }, () => Array<Cell>(cols).fill(0));
  for (const m of moves.slice(0, Math.max(0, step))) {
    const piece: Cell = m.player === "a" ? 1 : 2;
    if (game === "connectfour" && typeof m.move === "number") {
      for (let r = rows - 1; r >= 0; r--) {
        if (board[r][m.move] === 0) {
          board[r][m.move] = piece;
          break;
        }
      }
    } else if (Array.isArray(m.move)) {
      board[m.move[0]][m.move[1]] = piece;
    }
  }
  return board;
}

/** Seconds as m:ss. */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Coins returned for a winning prediction (the server rounds down too). */
export function potentialPayout(stake: number, odds: number | null | undefined): number {
  if (!odds || !Number.isFinite(stake) || stake <= 0) return 0;
  return Math.floor(stake * odds);
}

export function pickLabel(pick: Pick, botA: string, botB: string): string {
  if (pick === "draw") return "Draw";
  return `${pick === "a" ? botA : botB} wins`;
}
