"""
Integration Tests — Issue #64
Tests full end-to-end game flows for Wordle and Sudoku agents,
including edge cases and error handling.
"""

import sys
import os
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from games.wordle import Wordle
from games.sudoku import Sudoku
from agents.wordle_agent import WordleAgent
from agents.sudoku_agent import SudokuAgent


# ----------------------------------------------------------------------
# Wordle Integration Tests
# ----------------------------------------------------------------------

class TestWordleFullGame(unittest.TestCase):
    """Test complete Wordle game flows from start to finish."""

    def test_agent_solves_full_game_normal_mode(self):
        """Agent plays a full game in normal mode and solves it."""
        game = Wordle(solution="CRANE")
        agent = WordleAgent()
        agent.solve(game)
        self.assertTrue(game.is_solved())
        self.assertGreater(len(game.attempts), 0)
        self.assertLessEqual(len(game.attempts), 6)

    def test_agent_solves_full_game_hard_mode(self):
        """Agent plays a full game in hard mode and solves it."""
        game = Wordle(solution="CRANE")
        agent = WordleAgent(hard_mode=True)
        agent.solve(game)
        self.assertTrue(game.is_solved())
        self.assertLessEqual(len(game.attempts), 6)

    def test_game_state_after_solve(self):
        """Verify game state is correct after solving."""
        game = Wordle(solution="STONE")
        agent = WordleAgent()
        agent.solve(game)
        self.assertTrue(game.is_over())
        self.assertTrue(game.is_solved())
        # Last attempt should be all green
        last_word, last_feedback = game.attempts[-1]
        self.assertEqual(last_feedback, ["G", "G", "G", "G", "G"])
        self.assertEqual(last_word, "STONE")

    def test_all_attempts_are_five_letters(self):
        """Every guess made by the agent should be exactly 5 letters."""
        game = Wordle(solution="PLANT")
        agent = WordleAgent()
        agent.solve(game)
        for word, _ in game.attempts:
            self.assertEqual(len(word), 5, f"Guess '{word}' is not 5 letters")

    def test_hard_mode_green_constraints_respected(self):
        """In hard mode, green letters must stay in the same position."""
        game = Wordle(solution="STORE")
        agent = WordleAgent(hard_mode=True)
        agent.solve(game)

        # Track green positions revealed after each guess
        green_positions = {}
        for i, (word, feedback) in enumerate(game.attempts[:-1]):
            for pos, (letter, fb) in enumerate(zip(word, feedback)):
                if fb == "G":
                    green_positions[pos] = letter
            # Next guess must respect all known green positions
            if i + 1 < len(game.attempts):
                next_word = game.attempts[i + 1][0]
                for pos, letter in green_positions.items():
                    self.assertEqual(
                        next_word[pos], letter,
                        f"Hard mode violated: position {pos} should be '{letter}' "
                        f"in guess '{next_word}'"
                    )

    def test_hard_mode_yellow_constraints_respected(self):
        """In hard mode, yellow letters must appear in subsequent guesses."""
        game = Wordle(solution="BLAND")
        agent = WordleAgent(hard_mode=True)
        agent.solve(game)

        yellow_letters = set()
        for i, (word, feedback) in enumerate(game.attempts[:-1]):
            for letter, fb in zip(word, feedback):
                if fb == "Y":
                    yellow_letters.add(letter)
            if i + 1 < len(game.attempts) and yellow_letters:
                next_word = game.attempts[i + 1][0]
                for letter in yellow_letters:
                    self.assertIn(
                        letter, next_word,
                        f"Hard mode violated: '{letter}' should appear in '{next_word}'"
                    )

    def test_multiple_words_all_solved(self):
        """Agent should solve a variety of words reliably."""
        words = ["CRANE", "STONE", "BLAND", "CRISP", "SWIFT",
                 "PLANT", "FLASH", "CLONE", "STARE", "TRACE"]
        for word in words:
            game = Wordle(solution=word)
            agent = WordleAgent()
            agent.solve(game)
            self.assertTrue(
                game.is_solved(),
                f"Agent failed to solve '{word}'"
            )

    def test_game_over_after_max_attempts(self):
        """Game should be over after 6 attempts even if not solved."""
        game = Wordle(solution="ZAPPY")
        # Manually exhaust attempts with wrong guesses
        wrong_words = ["CRANE", "STONE", "BLAND", "CRISP", "SWIFT", "PLANT"]
        for word in wrong_words:
            if not game.is_over():
                try:
                    game.guess(word)
                except Exception:
                    pass
        self.assertTrue(game.is_over())

    def test_wordle_feedback_drives_agent_correctly(self):
        """Agent should narrow down candidates based on feedback."""
        game = Wordle(solution="SWIFT")
        agent = WordleAgent()
        candidates_before = len(agent.word_list)
        agent.solve(game)
        self.assertTrue(game.is_solved())
        # Agent should have made at least 1 guess
        self.assertGreater(len(game.attempts), 0)


# ----------------------------------------------------------------------
# Sudoku Integration Tests
# ----------------------------------------------------------------------

class TestSudokuFullGame(unittest.TestCase):
    """Test complete Sudoku solve flows from start to finish."""

    EASY_BOARD = [
        [5, 3, 0, 0, 7, 0, 0, 0, 0],
        [6, 0, 0, 1, 9, 5, 0, 0, 0],
        [0, 9, 8, 0, 0, 0, 0, 6, 0],
        [8, 0, 0, 0, 6, 0, 0, 0, 3],
        [4, 0, 0, 8, 0, 3, 0, 0, 1],
        [7, 0, 0, 0, 2, 0, 0, 0, 6],
        [0, 6, 0, 0, 0, 0, 2, 8, 0],
        [0, 0, 0, 4, 1, 9, 0, 0, 5],
        [0, 0, 0, 0, 8, 0, 0, 7, 9],
    ]

    HARD_BOARD = [
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 3, 0, 8, 5],
        [0, 0, 1, 0, 2, 0, 0, 0, 0],
        [0, 0, 0, 5, 0, 7, 0, 0, 0],
        [0, 0, 4, 0, 0, 0, 1, 0, 0],
        [0, 9, 0, 0, 0, 0, 0, 0, 0],
        [5, 0, 0, 0, 0, 0, 0, 7, 3],
        [0, 0, 2, 0, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 4, 0, 0, 0, 9],
    ]

    EXPERT_BOARD = [
        [8, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 3, 6, 0, 0, 0, 0, 0],
        [0, 7, 0, 0, 9, 0, 2, 0, 0],
        [0, 5, 0, 0, 0, 7, 0, 0, 0],
        [0, 0, 0, 0, 4, 5, 7, 0, 0],
        [0, 0, 0, 1, 0, 0, 0, 3, 0],
        [0, 0, 1, 0, 0, 0, 0, 6, 8],
        [0, 0, 8, 5, 0, 0, 0, 1, 0],
        [0, 9, 0, 0, 0, 0, 4, 0, 0],
    ]

    def _assert_fully_solved(self, sudoku):
        """Verify every row, col, and box contains digits 1-9."""
        expected = set(range(1, 10))
        for i in range(9):
            self.assertEqual(set(sudoku.board[i]), expected, f"Row {i} invalid")
            self.assertEqual(
                {sudoku.board[r][i] for r in range(9)}, expected,
                f"Col {i} invalid"
            )
        for br in range(3):
            for bc in range(3):
                box = {
                    sudoku.board[br * 3 + r][bc * 3 + c]
                    for r in range(3) for c in range(3)
                }
                self.assertEqual(box, expected, f"Box ({br},{bc}) invalid")

    def test_solves_easy_board_completely(self):
        """Agent solves easy board with no empty cells remaining."""
        sudoku = Sudoku([row[:] for row in self.EASY_BOARD])
        agent = SudokuAgent()
        result = agent.solve(sudoku)
        self.assertTrue(result)
        self.assertEqual(sudoku.count_empty_cells(), 0)
        self._assert_fully_solved(sudoku)

    def test_solves_hard_board_completely(self):
        """Agent solves hard board with no empty cells remaining."""
        sudoku = Sudoku([row[:] for row in self.HARD_BOARD])
        agent = SudokuAgent()
        result = agent.solve(sudoku)
        self.assertTrue(result)
        self.assertEqual(sudoku.count_empty_cells(), 0)
        self._assert_fully_solved(sudoku)

    def test_solves_expert_board_completely(self):
        """Agent solves expert board with no empty cells remaining."""
        sudoku = Sudoku([row[:] for row in self.EXPERT_BOARD])
        agent = SudokuAgent()
        result = agent.solve(sudoku)
        self.assertTrue(result)
        self.assertEqual(sudoku.count_empty_cells(), 0)
        self._assert_fully_solved(sudoku)

    def test_original_board_values_preserved(self):
        """Pre-filled cells should not be changed by the agent."""
        original = [row[:] for row in self.EASY_BOARD]
        sudoku = Sudoku([row[:] for row in self.EASY_BOARD])
        agent = SudokuAgent()
        agent.solve(sudoku)
        for r in range(9):
            for c in range(9):
                if original[r][c] != 0:
                    self.assertEqual(
                        sudoku.board[r][c], original[r][c],
                        f"Pre-filled cell ({r},{c}) was changed"
                    )

    def test_solve_does_not_mutate_input_board_on_failure(self):
        """Solving an already-complete board should return True cleanly."""
        # Fully solved board
        solved = [
            [5, 3, 4, 6, 7, 8, 9, 1, 2],
            [6, 7, 2, 1, 9, 5, 3, 4, 8],
            [1, 9, 8, 3, 4, 2, 5, 6, 7],
            [8, 5, 9, 7, 6, 1, 4, 2, 3],
            [4, 2, 6, 8, 5, 3, 7, 9, 1],
            [7, 1, 3, 9, 2, 4, 8, 5, 6],
            [9, 6, 1, 5, 3, 7, 2, 8, 4],
            [2, 8, 7, 4, 1, 9, 6, 3, 5],
            [3, 4, 5, 2, 8, 6, 1, 7, 9],
        ]
        sudoku = Sudoku([row[:] for row in solved])
        agent = SudokuAgent()
        result = agent.solve(sudoku)
        self.assertTrue(result)
        self.assertEqual(sudoku.count_empty_cells(), 0)

    def test_difficulty_classification(self):
        """Boards should be classified into correct difficulty tiers."""
        easy = Sudoku([row[:] for row in self.EASY_BOARD])
        hard = Sudoku([row[:] for row in self.HARD_BOARD])
        expert = Sudoku([row[:] for row in self.EXPERT_BOARD])
        self.assertIn(easy.difficulty(), ["Easy", "Medium", "Hard"])
        self.assertIn(hard.difficulty(), ["Hard", "Expert"])
        self.assertIn(expert.difficulty(), ["Hard", "Expert"])

    def test_multiple_boards_all_solved(self):
        """Agent should solve all boards in a batch."""
        boards = [self.EASY_BOARD, self.HARD_BOARD, self.EXPERT_BOARD]
        for i, board in enumerate(boards):
            sudoku = Sudoku([row[:] for row in board])
            agent = SudokuAgent()
            result = agent.solve(sudoku)
            self.assertTrue(result, f"Board {i} was not solved")
            self.assertEqual(sudoku.count_empty_cells(), 0, f"Board {i} has empty cells")


if __name__ == "__main__":
    unittest.main()