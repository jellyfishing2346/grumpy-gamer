"""
Connect Four Gymnasium Environment for Reinforcement Learning

This environment implements Connect Four as a Gymnasium environment,
suitable for training RL agents using algorithms like PPO or DQN.

Board representation:
- 6 rows x 7 columns
- 0 = empty, 1 = player 1 (agent), -1 = player 2 (opponent)
"""

import gymnasium as gym
from gymnasium import spaces
import numpy as np
from typing import Optional, Tuple, Dict, Any


class ConnectFourEnv(gym.Env):
    """
    Connect Four environment for reinforcement learning.

    The agent plays as player 1 (value=1) and the opponent plays as player 2 (value=-1).
    Actions are column indices (0-6) where the piece will drop.
    """

    metadata = {"render_modes": ["human", "ansi"], "render_fps": 4}

    ROWS = 6
    COLS = 7
    WIN_LENGTH = 4

    def __init__(
        self,
        render_mode: Optional[str] = None,
        opponent: str = "random",  # "random", "minimax", "self"
        opponent_starts: bool = False,
    ):
        super().__init__()

        self.render_mode = render_mode
        self.opponent_type = opponent
        self.opponent_starts = opponent_starts

        # Observation space: 6x7 board with 3 channels (empty, player1, player2)
        # Using one-hot encoding for better neural network learning
        self.observation_space = spaces.Box(
            low=0, high=1, shape=(3, self.ROWS, self.COLS), dtype=np.float32
        )

        # Action space: 7 columns to choose from
        self.action_space = spaces.Discrete(self.COLS)

        # Initialize board
        self.board = np.zeros((self.ROWS, self.COLS), dtype=np.int8)
        self.current_player = 1
        self.done = False
        self.winner = None

    def _get_obs(self) -> np.ndarray:
        """Convert board to one-hot encoded observation."""
        obs = np.zeros((3, self.ROWS, self.COLS), dtype=np.float32)
        obs[0] = (self.board == 0).astype(np.float32)  # Empty cells
        obs[1] = (self.board == 1).astype(np.float32)  # Player 1 pieces
        obs[2] = (self.board == -1).astype(np.float32)  # Player 2 pieces
        return obs

    def _get_info(self) -> Dict[str, Any]:
        """Return additional info."""
        return {
            "valid_moves": self._get_valid_moves(),
            "current_player": self.current_player,
            "winner": self.winner,
        }

    def _get_valid_moves(self) -> np.ndarray:
        """Get array of valid column indices."""
        return np.where(np.atleast_1d(self.board[0] == 0))[0]

    def _is_valid_move(self, col: int) -> bool:
        """Check if a column has room for a piece."""
        return 0 <= col < self.COLS and self.board[0, col] == 0

    def _drop_piece(self, col: int, player: int) -> int:
        """Drop a piece in the column, return the row it landed in."""
        for row in range(self.ROWS - 1, -1, -1):
            if self.board[row, col] == 0:
                self.board[row, col] = player
                return row
        return -1  # Column is full (shouldn't happen if validated)

    def _check_winner(self, row: int, col: int, player: int) -> bool:
        """Check if the last move at (row, col) created a win."""
        directions = [
            (0, 1),   # Horizontal
            (1, 0),   # Vertical
            (1, 1),   # Diagonal down-right
            (1, -1),  # Diagonal down-left
        ]

        for dr, dc in directions:
            count = 1
            # Check positive direction
            r, c = row + dr, col + dc
            while 0 <= r < self.ROWS and 0 <= c < self.COLS and self.board[r, c] == player:
                count += 1
                r += dr
                c += dc
            # Check negative direction
            r, c = row - dr, col - dc
            while 0 <= r < self.ROWS and 0 <= c < self.COLS and self.board[r, c] == player:
                count += 1
                r -= dr
                c -= dc

            if count >= self.WIN_LENGTH:
                return True

        return False

    def _is_board_full(self) -> bool:
        """Check if the board is completely filled."""
        return np.all(self.board[0] != 0)

    def _get_opponent_move(self) -> int:
        """Get a move from the opponent based on opponent type."""
        valid_moves = self._get_valid_moves()

        if len(valid_moves) == 0:
            return -1

        if self.opponent_type == "random":
            return np.random.choice(valid_moves)
        elif self.opponent_type == "minimax":
            return self._minimax_move(valid_moves, depth=4)
        elif self.opponent_type == "self":
            # For self-play, this is handled externally
            return -1
        else:
            return np.random.choice(valid_moves)

    def _minimax_move(self, valid_moves: np.ndarray, depth: int = 4) -> int:
        """Simple minimax with alpha-beta pruning for opponent."""
        best_score = float('inf')  # Opponent minimizes (plays as -1)
        best_move = valid_moves[0]

        for col in valid_moves:
            # Make move
            row = self._drop_piece(col, -1)

            if self._check_winner(row, col, -1):
                self.board[row, col] = 0
                return col  # Winning move

            score = self._minimax(depth - 1, True, float('-inf'), float('inf'))
            self.board[row, col] = 0

            if score < best_score:
                best_score = score
                best_move = col

        return best_move

    def _minimax(
        self, depth: int, is_maximizing: bool, alpha: float, beta: float
    ) -> float:
        """Minimax with alpha-beta pruning."""
        valid_moves = self._get_valid_moves()

        if len(valid_moves) == 0:
            return 0  # Draw

        if depth == 0:
            return self._evaluate_board()

        if is_maximizing:
            max_eval = float('-inf')
            for col in valid_moves:
                row = self._drop_piece(col, 1)
                if self._check_winner(row, col, 1):
                    self.board[row, col] = 0
                    return 1000 + depth
                eval_score = self._minimax(depth - 1, False, alpha, beta)
                self.board[row, col] = 0
                max_eval = max(max_eval, eval_score)
                alpha = max(alpha, eval_score)
                if beta <= alpha:
                    break
            return max_eval
        else:
            min_eval = float('inf')
            for col in valid_moves:
                row = self._drop_piece(col, -1)
                if self._check_winner(row, col, -1):
                    self.board[row, col] = 0
                    return -1000 - depth
                eval_score = self._minimax(depth - 1, True, alpha, beta)
                self.board[row, col] = 0
                min_eval = min(min_eval, eval_score)
                beta = min(beta, eval_score)
                if beta <= alpha:
                    break
            return min_eval

    def _evaluate_board(self) -> float:
        """Heuristic evaluation of board position."""
        score = 0

        # Center column preference
        center_array = self.board[:, self.COLS // 2]
        score += np.sum(center_array == 1) * 3
        score -= np.sum(center_array == -1) * 3

        # Evaluate windows of 4
        for row in range(self.ROWS):
            for col in range(self.COLS - 3):
                window = self.board[row, col:col + 4]
                score += self._evaluate_window(window)

        for row in range(self.ROWS - 3):
            for col in range(self.COLS):
                window = self.board[row:row + 4, col]
                score += self._evaluate_window(window)

        # Diagonals
        for row in range(self.ROWS - 3):
            for col in range(self.COLS - 3):
                window = [self.board[row + i, col + i] for i in range(4)]
                score += self._evaluate_window(np.array(window))

        for row in range(3, self.ROWS):
            for col in range(self.COLS - 3):
                window = [self.board[row - i, col + i] for i in range(4)]
                score += self._evaluate_window(np.array(window))

        return score

    def _evaluate_window(self, window: np.ndarray) -> float:
        """Evaluate a window of 4 cells."""
        score = 0
        player_count = np.sum(window == 1)
        opponent_count = np.sum(window == -1)
        empty_count = np.sum(window == 0)

        if player_count == 4:
            score += 100
        elif player_count == 3 and empty_count == 1:
            score += 5
        elif player_count == 2 and empty_count == 2:
            score += 2

        if opponent_count == 3 and empty_count == 1:
            score -= 4  # Block opponent

        return score

    def reset(
        self, seed: Optional[int] = None, options: Optional[Dict] = None
    ) -> Tuple[np.ndarray, Dict]:
        """Reset the environment."""
        super().reset(seed=seed)

        self.board = np.zeros((self.ROWS, self.COLS), dtype=np.int8)
        self.current_player = 1
        self.done = False
        self.winner = None

        # If opponent starts, make their move first
        if self.opponent_starts and self.opponent_type != "self":
            opp_move = self._get_opponent_move()
            if opp_move >= 0:
                self._drop_piece(opp_move, -1)

        return self._get_obs(), self._get_info()

    def step(self, action: int) -> Tuple[np.ndarray, float, bool, bool, Dict]:
        """
        Take a step in the environment.

        Args:
            action: Column index (0-6) to drop a piece

        Returns:
            observation, reward, terminated, truncated, info
        """
        reward = 0.0
        terminated = False
        truncated = False

        # Check if action is valid
        if not self._is_valid_move(action):
            # Invalid move penalty - pick a random valid move instead
            valid_moves = self._get_valid_moves()
            if len(valid_moves) == 0:
                terminated = True
                return self._get_obs(), -1.0, terminated, truncated, self._get_info()
            reward = -0.5  # Penalty for invalid move
            action = np.random.choice(valid_moves)

        # Make the agent's move
        row = self._drop_piece(action, 1)

        # Check if agent won
        if self._check_winner(row, action, 1):
            self.winner = 1
            self.done = True
            return self._get_obs(), 1.0, True, False, self._get_info()

        # Check for draw
        if self._is_board_full():
            self.done = True
            return self._get_obs(), 0.1, True, False, self._get_info()

        # Opponent's turn (if not self-play)
        if self.opponent_type != "self":
            opp_action = self._get_opponent_move()
            if opp_action >= 0:
                opp_row = self._drop_piece(opp_action, -1)

                # Check if opponent won
                if self._check_winner(opp_row, opp_action, -1):
                    self.winner = -1
                    self.done = True
                    return self._get_obs(), -1.0, True, False, self._get_info()

                # Check for draw after opponent's move
                if self._is_board_full():
                    self.done = True
                    return self._get_obs(), 0.1, True, False, self._get_info()

        # Small reward for making a valid move / controlling center
        if action == self.COLS // 2:
            reward += 0.01  # Slight preference for center

        return self._get_obs(), reward, terminated, truncated, self._get_info()

    def render(self) -> Optional[str]:
        """Render the board."""
        if self.render_mode == "ansi" or self.render_mode == "human":
            symbols = {0: ".", 1: "X", -1: "O"}
            lines = []
            lines.append(" " + " ".join(str(i) for i in range(self.COLS)))
            for row in range(self.ROWS):
                line = "|" + "|".join(symbols[self.board[row, col]] for col in range(self.COLS)) + "|"
                lines.append(line)
            lines.append("+" + "-" * (self.COLS * 2 - 1) + "+")
            board_str = "\n".join(lines)

            if self.render_mode == "human":
                print(board_str)
            return board_str
        return None

    def get_action_mask(self) -> np.ndarray:
        """Return a mask of valid actions (for masked PPO)."""
        return (self.board[0] == 0).astype(np.float32)


# Register the environment
gym.register(
    id="ConnectFour-v0",
    entry_point="rl.environments.connectfour_env:ConnectFourEnv",
)
