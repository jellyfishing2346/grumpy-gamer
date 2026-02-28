class Sudoku:
    def __init__(self, board):
        self.board = board

    def print_board(self):
        for i, row in enumerate(self.board):
            if i % 3 == 0 and i != 0:
                print("------+-------+------")
            row_str = ""
            for j, num in enumerate(row):
                if j % 3 == 0 and j != 0:
                    row_str += "| "
                row_str += (str(num) if num != 0 else '.') + " "
            print(row_str)

    def is_valid(self, row, col, num):
        for i in range(9):
            if self.board[row][i] == num or self.board[i][col] == num:
                return False
        start_row, start_col = 3 * (row // 3), 3 * (col // 3)
        for i in range(3):
            for j in range(3):
                if self.board[start_row + i][start_col + j] == num:
                    return False
        return True

    def get_candidates(self, row, col):
        """Return the set of valid numbers for a given empty cell."""
        if self.board[row][col] != 0:
            return set()
        return {num for num in range(1, 10) if self.is_valid(row, col, num)}

    def count_empty_cells(self):
        return sum(1 for row in self.board for cell in row if cell == 0)

    def difficulty(self):
        """Estimate difficulty based on number of empty cells."""
        empty = self.count_empty_cells()
        if empty <= 30:
            return "Easy"
        elif empty <= 45:
            return "Medium"
        elif empty <= 55:
            return "Hard"
        else:
            return "Expert"