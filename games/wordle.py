class Wordle:
    """
    Wordle game engine.

    Simulates the Wordle word-guessing game where a player has up to 6
    attempts to guess a 5-letter word. After each guess, feedback is
    provided for each letter:
      - G (Green)  = correct letter, correct position
      - Y (Yellow) = correct letter, wrong position
      - X (Gray)   = letter not in the word
    """

    GREEN = "G"   # Correct letter, correct position
    YELLOW = "Y"  # Correct letter, wrong position
    GRAY = "X"    # Letter not in word

    def __init__(self, solution="CRANE"):
        """
        Initialise a new Wordle game.

        Args:
            solution (str): The 5-letter target word. Defaults to "CRANE".
        """
        self.solution = solution.upper()
        self.max_attempts = 6
        self.attempts = []

    def guess(self, word):
        """
        Submit a guess and receive letter-by-letter feedback.

        Uses a two-pass algorithm to correctly handle duplicate letters:
          1. First pass marks exact matches (Green).
          2. Second pass marks misplaced letters (Yellow).

        Args:
            word (str): A 5-letter guess.

        Returns:
            list[str]: A list of 5 feedback characters ('G', 'Y', or 'X').

        Raises:
            ValueError: If the guess is not exactly 5 letters.
            RuntimeError: If no attempts remain.
        """
        word = word.upper()
        if len(word) != 5:
            raise ValueError("Guess must be a 5-letter word.")
        if len(self.attempts) >= self.max_attempts:
            raise RuntimeError("No attempts remaining.")

        feedback = [self.GRAY] * 5
        solution_chars = list(self.solution)
        guess_chars = list(word)

        # First pass: mark greens
        for i in range(5):
            if guess_chars[i] == solution_chars[i]:
                feedback[i] = self.GREEN
                solution_chars[i] = None  # consume this letter
                guess_chars[i] = None

        # Second pass: mark yellows
        for i in range(5):
            if guess_chars[i] is not None:
                if guess_chars[i] in solution_chars:
                    feedback[i] = self.YELLOW
                    solution_chars[solution_chars.index(guess_chars[i])] = None

        self.attempts.append((word, feedback))
        return feedback

    def is_solved(self):
        """
        Check whether the puzzle has been solved.

        Returns:
            bool: True if the last guess was entirely correct, False otherwise.
        """
        return bool(self.attempts) and self.attempts[-1][1] == [self.GREEN] * 5

    def is_over(self):
        """
        Check whether the game is over (solved or out of attempts).

        Returns:
            bool: True if the game has ended, False if guesses remain.
        """
        return self.is_solved() or len(self.attempts) >= self.max_attempts

    def print_board(self):
        """Print the current board state with letter-feedback pairs."""
        for word, feedback in self.attempts:
            print(" ".join(f"{l}({f})" for l, f in zip(word, feedback)))