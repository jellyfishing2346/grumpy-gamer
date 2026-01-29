class SudokuAgent:
    def solve(self, sudoku):
        for row in range(9):
            for col in range(9):
                if sudoku.board[row][col] == 0:
                    for num in range(1, 10):
                        if sudoku.is_valid(row, col, num):
                            sudoku.board[row][col] = num
                            if self.solve(sudoku):
                                return True
                            sudoku.board[row][col] = 0
                    return False  # No valid number found, trigger backtracking
        return True  # No empty cells left, puzzle solved