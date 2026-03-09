class Sudoku:
    """
    Sudoku puzzle engine.

    Represents a 9x9 Sudoku board and provides methods for validating
    placements, retrieving candidates, and assessing difficulty.
    Empty cells are represented by 0.
    """

    def __init__(self, board):
        """
        Initialise a Sudoku puzzle.

        Args:
            board (list[list[int]]): A 9x9 grid of integers where 0
                represents an empty cell and 1-9 represent filled cells.
        """
        self.board = board

    def print_board(self):
        """Print the board in a human-readable 9x9 grid format."""
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
        """
        Check whether placing num at (row, col) is valid.

        Validates against the row, column, and 3x3 box constraints.

        Args:
            row (int): Row index (0-8).
            col (int): Column index (0-8).
            num (int): Number to place (1-9).

        Returns:
            bool: True if the placement is valid, False otherwise.
        """
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
        """
        Return the set of valid numbers for a given empty cell.

        Args:
            row (int): Row index (0-8).
            col (int): Column index (0-8).

        Returns:
            set[int]: Valid numbers for this cell, or empty set if filled.
        """
        if self.board[row][col] != 0:
            return set()
        return {num for num in range(1, 10) if self.is_valid(row, col, num)}

    def count_empty_cells(self):
        """
        Count the number of empty cells remaining on the board.

        Returns:
            int: Number of cells containing 0.
        """
        return sum(1 for row in self.board for cell in row if cell == 0)

    def difficulty(self):
        """
        Estimate puzzle difficulty based on the number of empty cells.

        Returns:
            str: One of 'Easy', 'Medium', 'Hard', or 'Expert'.
        """
        empty = self.count_empty_cells()
        if empty <= 30:
            return "Easy"
        elif empty <= 45:
            return "Medium"
        elif empty <= 55:
            return "Hard"
        else:
            return "Expert"