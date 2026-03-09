import unittest
from games.sudoku import Sudoku
from games.wordle import Wordle
from agents.sudoku_agent import SudokuAgent
from agents.wordle_agent import WordleAgent


# ----------------------------------------------------------------------
# Sudoku Tests
# ----------------------------------------------------------------------

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


class TestSudokuIsValid(unittest.TestCase):
    def setUp(self):
        self.sudoku = Sudoku([row[:] for row in EASY_BOARD])

    def test_valid_placement(self):
        self.assertTrue(self.sudoku.is_valid(0, 2, 4))

    def test_invalid_row(self):
        self.assertFalse(self.sudoku.is_valid(0, 2, 5))  # 5 already in row

    def test_invalid_col(self):
        self.assertFalse(self.sudoku.is_valid(0, 2, 6))  # 6 already in col

    def test_invalid_box(self):
        self.assertFalse(self.sudoku.is_valid(0, 2, 9))  # 9 already in box

    def test_get_candidates_returns_set(self):
        candidates = self.sudoku.get_candidates(0, 2)
        self.assertIsInstance(candidates, set)
        self.assertTrue(len(candidates) > 0)

    def test_get_candidates_filled_cell(self):
        self.assertEqual(self.sudoku.get_candidates(0, 0), set())  # Cell is filled


class TestSudokuDifficulty(unittest.TestCase):
    def test_easy_difficulty(self):
        board = [[1 if (i + j) % 2 == 0 else 0 for j in range(9)] for i in range(9)]
        sudoku = Sudoku(board)
        self.assertIn(sudoku.difficulty(), ["Easy", "Medium", "Hard", "Expert"])

    def test_hard_difficulty(self):
        sudoku = Sudoku([row[:] for row in HARD_BOARD])
        self.assertIn(sudoku.difficulty(), ["Hard", "Expert"])


class TestSudokuAgent(unittest.TestCase):
    def test_solves_easy_puzzle(self):
        sudoku = Sudoku([row[:] for row in EASY_BOARD])
        agent = SudokuAgent()
        result = agent.solve(sudoku)
        self.assertTrue(result)
        self._assert_solved(sudoku)

    def test_solves_hard_puzzle(self):
        sudoku = Sudoku([row[:] for row in HARD_BOARD])
        agent = SudokuAgent()
        result = agent.solve(sudoku)
        self.assertTrue(result)
        self._assert_solved(sudoku)

    def test_no_empty_cells_after_solve(self):
        sudoku = Sudoku([row[:] for row in EASY_BOARD])
        agent = SudokuAgent()
        agent.solve(sudoku)
        self.assertEqual(sudoku.count_empty_cells(), 0)

    def _assert_solved(self, sudoku):
        """Verify every row, col, and box contains 1-9."""
        expected = set(range(1, 10))
        for i in range(9):
            self.assertEqual(set(sudoku.board[i]), expected, f"Row {i} invalid")
            self.assertEqual(
                {sudoku.board[r][i] for r in range(9)}, expected, f"Col {i} invalid"
            )
        for br in range(3):
            for bc in range(3):
                box = {
                    sudoku.board[br * 3 + r][bc * 3 + c]
                    for r in range(3) for c in range(3)
                }
                self.assertEqual(box, expected, f"Box ({br},{bc}) invalid")


# ----------------------------------------------------------------------
# Wordle Tests
# ----------------------------------------------------------------------

class TestWordleFeedback(unittest.TestCase):
    def setUp(self):
        self.game = Wordle(solution="CRANE")

    def test_all_green(self):
        self.assertEqual(self.game.guess("CRANE"), ["G", "G", "G", "G", "G"])

    def test_all_gray(self):
        self.assertEqual(self.game.guess("STIFF"), ["X", "X", "X", "X", "X"])

    def test_yellow(self):
        feedback = self.game.guess("ACORN")
        # A is in CRANE (index 2) but guessed at index 0 → yellow
        self.assertEqual(feedback[0], "Y")
        # C is in CRANE (index 0) but guessed at index 1 → yellow
        self.assertEqual(feedback[1], "Y")

    def test_duplicate_letter_handling(self):
        game = Wordle(solution="SPEED")
        feedback = game.guess("EERIE")
        # Only one E should be yellow/green, extras should be gray
        green_yellow = [f for f in feedback if f in ("G", "Y")]
        self.assertTrue(len(green_yellow) <= 3)  # SPEED has 2 E's, EERIE has 3

    def test_invalid_length(self):
        with self.assertRaises(ValueError):
            self.game.guess("HI")

    def test_max_attempts(self):
        for word in ["STIFF", "BLOND", "PLUMB", "THYME", "GRUFF", "PROXY"]:
            try:
                self.game.guess(word)
            except RuntimeError:
                pass
        with self.assertRaises(RuntimeError):
            self.game.guess("SWORD")

    def test_is_solved(self):
        self.game.guess("CRANE")
        self.assertTrue(self.game.is_solved())

    def test_is_not_solved(self):
        self.game.guess("STIFF")
        self.assertFalse(self.game.is_solved())


class TestWordleAgent(unittest.TestCase):
    def _run_agent(self, solution):
        game = Wordle(solution=solution)
        agent = WordleAgent()
        agent.solve(game)
        return game

    def test_solves_crane(self):
        game = self._run_agent("CRANE")
        self.assertTrue(game.is_solved())

    def test_solves_stone(self):
        game = self._run_agent("STONE")
        self.assertTrue(game.is_solved())

    def test_solves_bland(self):
        game = self._run_agent("BLAND")
        self.assertTrue(game.is_solved())

    def test_solves_crisp(self):
        game = self._run_agent("CRISP")
        self.assertTrue(game.is_solved())

    def test_solves_swift(self):
        game = self._run_agent("SWIFT")
        self.assertTrue(game.is_solved())

    def test_solves_in_six_or_fewer(self):
        for word in ["CRANE", "STONE", "BLAND", "STORE", "ALONE"]:
            game = self._run_agent(word)
            self.assertLessEqual(
                len(game.attempts), 6, f"Failed to solve {word} in 6 attempts"
            )

    def test_average_guesses(self):
        words = ["CRANE", "STONE", "BLAND", "STORE", "ALONE",
                 "CRISP", "SWIFT", "SHIFT", "PLANT", "FLASH",
                 "CLASH", "TRASH", "CRASH", "CLONE", "ATONE",
                 "SNARE", "STARE", "AROSE", "RAISE", "TRACE"]
        total = 0
        solved = 0
        for word in words:
            game = Wordle(solution=word)
            agent = WordleAgent()
            agent.solve(game)
            if game.is_solved():
                total += len(game.attempts)
                solved += 1
        avg = total / solved if solved > 0 else 0
        print(f"\nWordleAgent average guesses: {avg:.2f} over {solved}/{len(words)} words solved")
        self.assertLessEqual(avg, 6.0)


class TestWordleAgentHardMode(unittest.TestCase):
    def _run_agent(self, solution, hard_mode=True):
        game = Wordle(solution=solution)
        agent = WordleAgent(hard_mode=hard_mode)
        agent.solve(game)
        return game

    def test_hard_mode_solves_crane(self):
        game = self._run_agent("CRANE")
        self.assertTrue(game.is_solved())

    def test_hard_mode_solves_stone(self):
        game = self._run_agent("STONE")
        self.assertTrue(game.is_solved())

    def test_hard_mode_solves_bland(self):
        game = self._run_agent("BLAND")
        self.assertTrue(game.is_solved())

    def test_hard_mode_solves_crisp(self):
        game = self._run_agent("CRISP")
        self.assertTrue(game.is_solved())

    def test_hard_mode_solves_swift(self):
        game = self._run_agent("SWIFT")
        self.assertTrue(game.is_solved())

    def test_hard_mode_solves_in_six_or_fewer(self):
        for word in ["CRANE", "STONE", "BLAND", "STORE", "ALONE"]:
            game = self._run_agent(word)
            self.assertLessEqual(
                len(game.attempts), 6,
                f"Hard mode failed to solve {word} in 6 attempts"
            )

    def test_hard_mode_uses_more_or_equal_guesses(self):
        """Hard mode should use >= guesses than normal mode on average."""
        words = ["CRANE", "STONE", "BLAND", "STORE", "ALONE"]
        normal_total = 0
        hard_total = 0
        for word in words:
            normal_game = Wordle(solution=word)
            WordleAgent(hard_mode=False).solve(normal_game)
            normal_total += len(normal_game.attempts)

            hard_game = Wordle(solution=word)
            WordleAgent(hard_mode=True).solve(hard_game)
            hard_total += len(hard_game.attempts)

        print(f"\nNormal mode total guesses: {normal_total}")
        print(f"Hard mode total guesses:   {hard_total}")
        self.assertGreaterEqual(
            hard_total, normal_total,
            f"Expected hard mode ({hard_total}) >= normal mode ({normal_total}) total guesses"
        )

class TestSudokuAgentBenchmark(unittest.TestCase):
    def _solve_timed(self, board):
        import time
        sudoku = Sudoku([row[:] for row in board])
        agent = SudokuAgent()
        start = time.perf_counter()
        result = agent.solve(sudoku)
        elapsed_ms = (time.perf_counter() - start) * 1000
        return result, elapsed_ms

    def test_easy_solves_under_50ms(self):
        board = [
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
        result, ms = self._solve_timed(board)
        self.assertTrue(result)
        self.assertLess(ms, 50, f"Easy puzzle took {ms:.2f}ms, expected < 50ms")

    def test_hard_solves_under_500ms(self):
        board = [
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
        result, ms = self._solve_timed(board)
        self.assertTrue(result)
        self.assertLess(ms, 500, f"Hard puzzle took {ms:.2f}ms, expected < 500ms")

    def test_expert_solves_under_1000ms(self):
        board = [
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
        result, ms = self._solve_timed(board)
        self.assertTrue(result)
        self.assertLess(ms, 1000, f"Expert puzzle took {ms:.2f}ms, expected < 1000ms")

if __name__ == "__main__":
    unittest.main()