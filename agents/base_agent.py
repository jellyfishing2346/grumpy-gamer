from abc import ABC, abstractmethod


class BaseAgent(ABC):
    """
    Abstract base class for all game-solving agents.

    All agents must implement the `solve` method which takes a game
    instance and attempts to solve it in-place.
    """

    @abstractmethod
    def solve(self, game):
        """
        Solve the given game instance.

        Args:
            game: A game object (e.g. Wordle, Sudoku) to solve.

        Returns:
            The solution or a success indicator depending on the game type.
        """
        pass