import string
from collections import Counter
from agents.base_agent import BaseAgent
import os

# A small built-in word list for fallback; ideally load from a file
COMMON_WORDS = [
    "CRANE", "SLOTH", "TRACE", "AUDIO", "RAISE", "AROSE", "STARE", "SNARE",
    "STORE", "SHORE", "SHONE", "STONE", "ATONE", "OZONE", "ALONE", "CLONE",
    "BLEND", "FLUTE", "GLARE", "PLANT", "BLAND", "BRAND", "GRANT", "FRANK",
    "BLANK", "PLANK", "CLASH", "FLASH", "TRASH", "CRASH", "BRASH", "DRASH",
    "CRIMP", "PRIMP", "SKIMP", "SHRIMP", "BLIMP", "CRISP", "PRISM", "TWIST",
    "SWIFT", "SHIFT", "THRIFT", "DRIFT", "GRIFT", "CRYPT", "TRYST", "GLYPH",
]


def load_word_list(path=None):
    """Load a word list from a file, or fall back to built-in list."""
    if path:
        # Resolve relative to project root
        root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        abs_path = os.path.join(root, path)
        try:
            with open(abs_path) as f:
                return [w.strip().upper() for w in f if len(w.strip()) == 5 and w.strip().isalpha()]
        except FileNotFoundError:
            pass
    return list(COMMON_WORDS)


class WordleAgent(BaseAgent):
    def __init__(self, word_list_path="data/wordlist.txt"):
        self.word_list = load_word_list(word_list_path)

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

    def _score_word(self, word, candidates):
        """Score a word by letter frequency across remaining candidates (higher = better)."""
        freq = Counter(letter for w in candidates for letter in set(w))
        return sum(freq[letter] for letter in set(word))

    def _best_guess(self, candidates):
        """Pick the candidate word with the highest frequency score."""
        return max(candidates, key=lambda w: self._score_word(w, candidates))

    def solve(self, game):
        """
        Solve a Wordle game instance.
        Returns the winning word if solved, or None if unsuccessful.
        """
        candidates = list(self.word_list)
        first_guess = "CRANE"  # Strong opener

        print(f"Starting Wordle solve (solution hidden)...\n")

        guess = first_guess
        while not game.is_over():
            print(f"Guessing: {guess}")
            feedback = game.guess(guess)
            print(f"Feedback: {' '.join(feedback)}\n")

            if game.is_solved():
                print(f"✅ Solved in {len(game.attempts)} attempt(s)!")
                return guess

            candidates = self._filter_candidates(candidates, guess, feedback)
            print(f"Remaining candidates: {candidates}")  # DEBUG

            if not candidates:
                print("❌ No candidates remaining — word may not be in word list.")
                return None

            guess = self._best_guess(candidates)

        print(f"❌ Failed to solve in {game.max_attempts} attempts.")
        return None