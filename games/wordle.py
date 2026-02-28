class Wordle:
    GREEN = "G"   # Correct letter, correct position
    YELLOW = "Y"  # Correct letter, wrong position
    GRAY = "X"    # Letter not in word

    def __init__(self, solution="CRANE"):
        self.solution = solution.upper()
        self.max_attempts = 6
        self.attempts = []

    def guess(self, word):
        """
        Returns a list of feedback characters for each letter:
          G = correct position
          Y = in word but wrong position
          X = not in word
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
        return bool(self.attempts) and self.attempts[-1][1] == [self.GREEN] * 5

    def is_over(self):
        return self.is_solved() or len(self.attempts) >= self.max_attempts

    def print_board(self):
        for word, feedback in self.attempts:
            print(" ".join(f"{l}({f})" for l, f in zip(word, feedback)))