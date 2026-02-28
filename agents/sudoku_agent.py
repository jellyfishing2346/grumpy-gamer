from agents.base_agent import BaseAgent


class SudokuAgent(BaseAgent):
    def solve(self, sudoku):
        """
        Solve a Sudoku puzzle using:
        1. Naked singles  - cells with only one possible value
        2. Hidden singles - values that can only go in one place in a unit
        3. Backtracking   - fallback for ambiguous puzzles
        """
        changed = True
        while changed:
            changed = self._apply_naked_singles(sudoku)
            changed |= self._apply_hidden_singles(sudoku)

        return self._backtrack(sudoku)

    # ------------------------------------------------------------------
    # Constraint Propagation
    # ------------------------------------------------------------------

    def _apply_naked_singles(self, sudoku):
        """Fill any cell that has exactly one candidate. Returns True if any cell was filled."""
        changed = False
        for row in range(9):
            for col in range(9):
                if sudoku.board[row][col] == 0:
                    candidates = sudoku.get_candidates(row, col)
                    if len(candidates) == 1:
                        sudoku.board[row][col] = candidates.pop()
                        changed = True
                    elif len(candidates) == 0:
                        return False  # Contradiction — puzzle is unsolvable from this state
        return changed

    def _apply_hidden_singles(self, sudoku):
        """
        For each unit (row, col, box), if a candidate value can only
        go in one cell, place it there. Returns True if any cell was filled.
        """
        changed = False

        # Rows
        for row in range(9):
            changed |= self._hidden_singles_in_unit(
                sudoku, [(row, col) for col in range(9)]
            )

        # Columns
        for col in range(9):
            changed |= self._hidden_singles_in_unit(
                sudoku, [(row, col) for row in range(9)]
            )

        # 3x3 Boxes
        for box_row in range(3):
            for box_col in range(3):
                cells = [
                    (box_row * 3 + r, box_col * 3 + c)
                    for r in range(3) for c in range(3)
                ]
                changed |= self._hidden_singles_in_unit(sudoku, cells)

        return changed

    def _hidden_singles_in_unit(self, sudoku, cells):
        """Check a unit (list of (row,col) pairs) for hidden singles."""
        changed = False
        candidate_positions = {}  # num -> list of cells where it's a candidate

        for row, col in cells:
            if sudoku.board[row][col] == 0:
                for num in sudoku.get_candidates(row, col):
                    candidate_positions.setdefault(num, []).append((row, col))

        for num, positions in candidate_positions.items():
            if len(positions) == 1:
                row, col = positions[0]
                if sudoku.board[row][col] == 0:
                    sudoku.board[row][col] = num
                    changed = True

        return changed

    # ------------------------------------------------------------------
    # Backtracking (fallback)
    # ------------------------------------------------------------------

    def _backtrack(self, sudoku):
        """Standard backtracking with MRV (most constrained cell first)."""
        empty = self._find_most_constrained(sudoku)
        if empty is None:
            return True  # Solved

        row, col = empty
        for num in sudoku.get_candidates(row, col):
            sudoku.board[row][col] = num
            if self._backtrack(sudoku):
                return True
            sudoku.board[row][col] = 0

        return False  # Trigger backtracking

    def _find_most_constrained(self, sudoku):
        """Return the empty cell with the fewest candidates (MRV heuristic)."""
        best = None
        best_count = 10

        for row in range(9):
            for col in range(9):
                if sudoku.board[row][col] == 0:
                    count = len(sudoku.get_candidates(row, col))
                    if count < best_count:
                        best_count = count
                        best = (row, col)

        return best