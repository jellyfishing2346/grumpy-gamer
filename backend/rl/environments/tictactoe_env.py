"""
Tic-Tac-Toe Gymnasium Environment for Reinforcement Learning

This environment allows an RL agent to learn to play Tic-Tac-Toe
by playing against various opponents (random, minimax, or self-play).
"""

import gymnasium as gym
from gymnasium import spaces
import numpy as np
from typing import Optional, Tuple, Dict, Any
import random


class TicTacToeEnv(gym.Env):
    """
    Tic-Tac-Toe environment for training RL agents.

    The board is represented as a 3x3 grid:
    - 0: Empty
    - 1: Agent (X)
    - -1: Opponent (O)

    Actions: 0-8 representing positions on the board

    Rewards:
    - Win: +1
    - Lose: -1
    - Draw: 0
    - Invalid move: -10 (heavily penalized)
    - Valid move: +0.1 (small reward for legal moves)
    """

    metadata = {"render_modes": ["human", "ansi"], "render_fps": 1}

    def __init__(
        self,
        opponent: str = "random",
        render_mode: Optional[str] = None
    ):
        """
        Initialize the Tic-Tac-Toe environment.

        Args:
            opponent: Type of opponent ("random", "minimax", "self")
            render_mode: How to render the environment
        """
        super().__init__()

        self.opponent = opponent
        self.render_mode = render_mode

        # Action space: 9 possible positions (0-8)
        self.action_space = spaces.Discrete(9)

        # Observation space: 3x3 board with values -1, 0, 1
        # Flattened to 9 values for simplicity
        self.observation_space = spaces.Box(
            low=-1, high=1, shape=(9,), dtype=np.float32
        )

        # Initialize the board
        self.board = np.zeros(9, dtype=np.float32)
        self.done = False
        self.winner = None

    def reset(
        self,
        seed: Optional[int] = None,
        options: Optional[Dict[str, Any]] = None
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        """Reset the environment to start a new game."""
        super().reset(seed=seed)

        self.board = np.zeros(9, dtype=np.float32)
        self.done = False
        self.winner = None

        # Randomly decide who goes first (50% chance opponent starts)
        if random.random() < 0.5:
            self._opponent_move()

        return self.board.copy(), {}

    def step(self, action: int) -> Tuple[np.ndarray, float, bool, bool, Dict[str, Any]]:
        """
        Take a step in the environment.

        Args:
            action: Position to place the agent's mark (0-8)

        Returns:
            observation, reward, terminated, truncated, info
        """
        if self.done:
            return self.board.copy(), 0.0, True, False, {"winner": self.winner}

        # Check if action is valid
        if self.board[action] != 0:
            # Invalid move - heavily penalize
            return self.board.copy(), -10.0, True, False, {"invalid_move": True}

        # Agent makes move
        self.board[action] = 1
        reward = 0.05  # Small reward for valid move

        # Check if agent won
        if self._check_winner(1):
            self.done = True
            self.winner = "agent"
            return self.board.copy(), 1.0, True, False, {"winner": "agent"}

        # Check for draw
        if self._is_board_full():
            self.done = True
            self.winner = "draw"
            return self.board.copy(), 0.0, True, False, {"winner": "draw"}

        # Opponent's turn
        self._opponent_move()

        # Check if opponent won
        if self._check_winner(-1):
            self.done = True
            self.winner = "opponent"
            return self.board.copy(), -1.0, True, False, {"winner": "opponent"}

        # Check for draw after opponent move
        if self._is_board_full():
            self.done = True
            self.winner = "draw"
            return self.board.copy(), 0.0, True, False, {"winner": "draw"}

        return self.board.copy(), reward, False, False, {}

    def _opponent_move(self) -> None:
        """Make a move for the opponent based on the opponent type."""
        if self._is_board_full():
            return

        available = np.where(self.board == 0)[0]

        if len(available) == 0:
            return

        if self.opponent == "random":
            move = np.random.choice(available)
        elif self.opponent == "minimax":
            move = self._minimax_move()
        else:  # "self" or unknown - use random
            move = np.random.choice(available)

        self.board[move] = -1

    def _minimax_move(self) -> int:
        """Get the best move using minimax algorithm."""
        best_score = float('inf')
        best_move = None

        for i in range(9):
            if self.board[i] == 0:
                self.board[i] = -1  # Opponent's mark
                score = self._minimax(True, -float('inf'), float('inf'))
                self.board[i] = 0

                if score < best_score:
                    best_score = score
                    best_move = i

        return best_move if best_move is not None else np.random.choice(np.where(self.board == 0)[0])

    def _minimax(self, is_maximizing: bool, alpha: float, beta: float) -> float:
        """
        Minimax algorithm with alpha-beta pruning.

        Args:
            is_maximizing: True if it's the agent's turn (maximizing)
            alpha: Alpha value for pruning
            beta: Beta value for pruning

        Returns:
            The best score for the current player
        """
        # Check for terminal states
        if self._check_winner(1):
            return 1
        if self._check_winner(-1):
            return -1
        if self._is_board_full():
            return 0

        if is_maximizing:
            max_score = -float('inf')
            for i in range(9):
                if self.board[i] == 0:
                    self.board[i] = 1
                    score = self._minimax(False, alpha, beta)
                    self.board[i] = 0
                    max_score = max(max_score, score)
                    alpha = max(alpha, score)
                    if beta <= alpha:
                        break
            return max_score
        else:
            min_score = float('inf')
            for i in range(9):
                if self.board[i] == 0:
                    self.board[i] = -1
                    score = self._minimax(True, alpha, beta)
                    self.board[i] = 0
                    min_score = min(min_score, score)
                    beta = min(beta, score)
                    if beta <= alpha:
                        break
            return min_score

    def _check_winner(self, player: int) -> bool:
        """Check if the specified player has won."""
        # Winning combinations
        lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],  # Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8],  # Columns
            [0, 4, 8], [2, 4, 6]               # Diagonals
        ]

        for line in lines:
            if all(self.board[i] == player for i in line):
                return True
        return False

    def _is_board_full(self) -> bool:
        """Check if the board is full."""
        return not np.any(self.board == 0)

    def get_valid_actions(self) -> np.ndarray:
        """Get array of valid actions (empty positions)."""
        return np.where(self.board == 0)[0]

    def render(self) -> Optional[str]:
        """Render the current board state."""
        if self.render_mode == "human" or self.render_mode == "ansi":
            symbols = {0: ".", 1: "X", -1: "O"}
            board_str = "\n"
            for i in range(3):
                row = " | ".join(symbols[int(self.board[i*3 + j])] for j in range(3))
                board_str += f" {row} \n"
                if i < 2:
                    board_str += "-----------\n"
            print(board_str)
            return board_str
        return None

    def close(self) -> None:
        """Clean up resources."""
        pass


# Register the environment with Gymnasium
def register_env():
    """Register TicTacToe environment with Gymnasium."""
    try:
        gym.envs.registration.register(
            id='TicTacToe-v0',
            entry_point='rl.environments.tictactoe_env:TicTacToeEnv',
        )
    except gym.error.Error:
        # Already registered
        pass


if __name__ == "__main__":
    # Test the environment
    env = TicTacToeEnv(opponent="random", render_mode="human")
    obs, info = env.reset()

    print("Testing TicTacToe Environment")
    print("Initial state:")
    env.render()

    done = False
    total_reward = 0

    while not done:
        # Random agent for testing
        valid_actions = env.get_valid_actions()
        if len(valid_actions) == 0:
            break
        action = np.random.choice(valid_actions)

        obs, reward, terminated, truncated, info = env.step(action)
        total_reward += reward
        done = terminated or truncated

        print(f"Action: {action}, Reward: {reward}")
        env.render()

    print(f"\nGame Over! Winner: {info.get('winner', 'unknown')}")
    print(f"Total Reward: {total_reward}")
