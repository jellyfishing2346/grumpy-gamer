import os
import string
from collections import Counter
from agents.base_agent import BaseAgent

# A small built-in word list for fallback; ideally load from a file
COMMON_WORDS = [
    "CRANE", "SLOTH", "TRACE", "AUDIO", "RAISE", "AROSE", "STARE", "SNARE",
    "STORE", "SHORE", "SHONE", "STONE", "ATONE", "OZONE", "ALONE", "CLONE",
    "BLEND", "FLUTE", "GLARE", "PLANT", "BLAND", "BRAND", "GRANT", "FRANK",
    "BLANK", "PLANK", "CLASH", "FLASH", "TRASH", "CRASH", "BRASH", "DRASH",
    "CRIMP", "PRIMP", "SKIMP", "BLIMP", "CRISP", "PRISM", "TWIST",
    "SWIFT", "SHIFT", "DRIFT", "CRYPT", "TRYST", "GLYPH",
]


def load_word_list(path=None):
    """Load a word list from a file, or fall back to built-in list."""
    if path:
        # Resolve relative to project root
        root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        abs_path = os.path.join(root, path)
        try:
            with open(abs_path) as f:
                return [
                    w.strip().upper() for w in f
                    if len(w.strip()) == 5 and w.strip().isalpha()
                ]
        except FileNotFoundError:
            pass
    return list(COMMON_WORDS)


class WordleAgent(BaseAgent):
    def __init__(self, word_list_path="data/wordlist.txt", hard_mode=False):
        self.word_list = load_word_list(word_list_path)
        self.hard_mode = hard_mode

    def _filter_candidates(self, candidates, guess, feedback):
        """Eliminate candidates based on feedback from a guess."""
        GREEN, YELLOW, GRAY = "G", "Y", "X"
        filtered = []

        for word in candidates:
            valid = True
            for i, (letter, fb) in enumerate(zip(guess, feedback)):
                if fb == GREEN:
                    if word[i] != letter:
                        valid = False
                        break
                elif fb == YELLOW:
                    if word[i] == letter or letter not in word:
                        valid = False
                        break
                elif fb == GRAY:
                    # Letter might still appear if it was also marked GREEN/YELLOW elsewhere
                    green_or_yellow_positions = [
                        j for j, (l, f) in enumerate(zip(guess, feedback))
                        if l == letter and f in (GREEN, YELLOW)
                    ]
                    if letter in word:
                        # Only disqualify if the letter appears more times than accounted for
                        accounted = len(green_or_yellow_positions)
                        if word.count(letter) > accounted:
                            valid = False
                            break
            if valid:
                filtered.append(word)

        return filtered

    def _obeys_hard_mode(self, word, green_constraints, yellow_constraints):
        """
        Check if a word satisfies hard mode constraints:
        - green_constraints: dict of {position: letter} that must match
        - yellow_constraints: list of (letter, position) that must be in word
          but NOT at the given position
        """
        for pos, letter in green_constraints.items():
            if word[pos] != letter:
                return False
        for letter, pos in yellow_constraints:
            if letter not in word:
                return False
            if word[pos] == letter:
                return False
        return True

    def _score_word(self, word, candidates):
        """Score a word by letter frequency across remaining candidates (higher = better)."""
        freq = Counter(letter for w in candidates for letter in set(w))
        return sum(freq[letter] for letter in set(word))

    def _best_guess(self, candidates, green_constraints=None, yellow_constraints=None):
        """
        Pick the candidate word with the highest frequency score.
        In hard mode, only consider words that satisfy constraints.
        """
        if self.hard_mode and green_constraints is not None:
            valid_candidates = [
                w for w in candidates
                if self._obeys_hard_mode(w, green_constraints, yellow_constraints)
            ]
            # Fall back to all candidates if no valid ones found
            pool = valid_candidates if valid_candidates else candidates
        else:
            pool = candidates
        return max(pool, key=lambda w: self._score_word(w, candidates))

    def solve(self, game):
        """
        Solve a Wordle game instance.
        Returns the winning word if solved, or None if unsuccessful.
        """
        candidates = list(self.word_list)
        first_guess = "CRANE"  # Strong opener

        mode_label = "HARD" if self.hard_mode else "NORMAL"
        print(f"Starting Wordle solve [{mode_label} MODE] (solution hidden)...\n")

        guess = first_guess
        green_constraints = {}    # {position: letter}
        yellow_constraints = []   # [(letter, position), ...]

        while not game.is_over():
            print(f"Guessing: {guess}")
            feedback = game.guess(guess)
            print(f"Feedback: {' '.join(feedback)}\n")

            if game.is_solved():
                print(f"✅ Solved in {len(game.attempts)} attempt(s)!")
                return guess

            # Update hard mode constraints from feedback
            for i, (letter, fb) in enumerate(zip(guess, feedback)):
                if fb == "G":
                    green_constraints[i] = letter
                elif fb == "Y":
                    yellow_constraints.append((letter, i))

            candidates = self._filter_candidates(candidates, guess, feedback)

            if not candidates:
                print("❌ No candidates remaining — word may not be in word list.")
                return None

            guess = self._best_guess(candidates, green_constraints, yellow_constraints)

        print(f"❌ Failed to solve in {game.max_attempts} attempts.")
        return None