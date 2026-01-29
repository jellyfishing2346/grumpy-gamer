
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from games.sudoku import Sudoku
from agents.sudoku_agent import SudokuAgent

if __name__ == "__main__":
    puzzle = [
        [5, 3, 0, 0, 7, 0, 0, 0, 0],
        [6, 0, 0, 1, 9, 5, 0, 0, 0], 
        [0, 9, 8, 0, 0, 0, 0, 6, 0], 
        [8, 0, 0, 0, 6, 0, 0, 0, 3], 
        [4, 0, 0, 8, 0, 3, 0, 0, 1], 
        [7, 0, 0, 0, 2, 0, 0, 0, 6], 
        [0, 6, 0, 0, 0, 0, 2, 8, 0], 
        [0, 0, 0, 4, 1, 9, 0, 0, 5], 
        [0, 0, 0, 0, 8, 0, 0, 7, 9]
    ]
    sudoku = Sudoku(puzzle)
    agent = SudokuAgent()
    print("Original Sudoku Puzzle:")
    sudoku.print_board()
    if agent.solve(sudoku):
        print("\nSolved Sudoku Puzzle:")
        sudoku.print_board()
    else:
        print("No solution exists.")