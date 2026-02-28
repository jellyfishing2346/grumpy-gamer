from abc import ABC, abstractmethod


class BaseAgent(ABC):
    @abstractmethod
    def solve(self, game):
        """Subclasses must implement this method."""
        pass