"""
Minesweeper Gymnasium Environment for Reinforcement Learning

This environment implements a Minesweeper game where the agent must:
- Reveal cells without hitting mines
- Use number clues to deduce safe cells
- Learn patterns and logical deduction

Observation space: 2D grid with channels for:
  - Channel 0: Revealed status (-1=hidden, 0-8=number of adjacent mines)
  - Channel 1: Flagged status (0 or 1)

Action space: Discrete(rows * cols) - index of cell to reveal

Rewards:
  - +0.1 for revealing a safe cell
  - +0.5 for revealing a cell that cascades (reveals more cells)
  - +10.0 for winning (all safe cells revealed)
  - -10.0 for hitting a mine
  - -0.1 for invalid action (already revealed/flagged)
"""

import gymnasium as gym
import numpy as np
from gymnasium import spaces
from typing import Tuple, Dict, Any, Optional, List


class MinesweeperEnv(gym.Env):
    """Minesweeper environment for RL training."""

    metadata = {"render_modes": ["human", "ansi"]}

    def __init__(
        self,
        rows: int = 8,
        cols: int = 8,
        num_mines: int = 10,
        render_mode: Optional[str] = None
    ):
        """
        Initialize Minesweeper environment.

        Args:
            rows: Number of rows in the grid
            cols: Number of columns in the grid
            num_mines: Number of mines to place
            render_mode: How to render the environment
        """
        super().__init__()

        self.rows = rows
        self.cols = cols
        self.num_mines = min(num_mines, rows * cols - 9)  # Leave room for first click
        self.render_mode = render_mode

        # Observation: 2 channels - revealed numbers and flagged status
        # Channel 0: -1 for hidden, 0-8 for revealed numbers
        # Channel 1: 0 or 1 for flagged
        self.observation_space = spaces.Box(
            low=-1,
            high=8,
            shape=(2, rows, cols),
            dtype=np.float32
        )

        # Action: choose a cell to reveal
        self.action_space = spaces.Discrete(rows * cols)

        # Game state
        self.mines = None  # 2D boolean array
        self.revealed = None  # 2D boolean array
        self.flagged = None  # 2D boolean array
        self.adjacent_counts = None  # 2D int array
        self.first_click = True
        self.game_over = False
        self.won = False

    def _place_mines(self, exclude_row: int, exclude_col: int) -> None:
        """Place mines on the board, excluding area around first click."""
        self.mines = np.zeros((self.rows, self.cols), dtype=bool)

        # Cells to exclude (3x3 around first click)
        excluded = set()
        for dr in range(-1, 2):
            for dc in range(-1, 2):
                nr, nc = exclude_row + dr, exclude_col + dc
                if 0 <= nr < self.rows and 0 <= nc < self.cols:
                    excluded.add((nr, nc))

        # Available cells for mines
        available = [
            (r, c) for r in range(self.rows) for c in range(self.cols)
            if (r, c) not in excluded
        ]

        # Randomly place mines
        mine_indices = np.random.choice(len(available), self.num_mines, replace=False)
        for idx in mine_indices:
            r, c = available[idx]
            self.mines[r, c] = True

        # Calculate adjacent mine counts
        self.adjacent_counts = np.zeros((self.rows, self.cols), dtype=np.int32)
        for r in range(self.rows):
            for c in range(self.cols):
                if not self.mines[r, c]:
                    count = 0
                    for dr in range(-1, 2):
                        for dc in range(-1, 2):
                            nr, nc = r + dr, c + dc
                            if 0 <= nr < self.rows and 0 <= nc < self.cols:
                                if self.mines[nr, nc]:
                                    count += 1
                    self.adjacent_counts[r, c] = count

    def _reveal_cell(self, row: int, col: int) -> int:
        """
        Reveal a cell and cascade if it's a zero.

        Returns number of cells revealed.
        """
        if self.revealed[row, col] or self.flagged[row, col]:
            return 0

        if self.mines[row, col]:
            self.revealed[row, col] = True
            return 1

        # Flood fill for empty cells
        cells_revealed = 0
        stack = [(row, col)]

        while stack:
            r, c = stack.pop()

            if r < 0 or r >= self.rows or c < 0 or c >= self.cols:
                continue
            if self.revealed[r, c] or self.flagged[r, c]:
                continue
            if self.mines[r, c]:
                continue

            self.revealed[r, c] = True
            cells_revealed += 1

            # If zero adjacent mines, reveal neighbors
            if self.adjacent_counts[r, c] == 0:
                for dr in range(-1, 2):
                    for dc in range(-1, 2):
                        if dr != 0 or dc != 0:
                            stack.append((r + dr, c + dc))

        return cells_revealed

    def _check_win(self) -> bool:
        """Check if all non-mine cells are revealed."""
        for r in range(self.rows):
            for c in range(self.cols):
                if not self.mines[r, c] and not self.revealed[r, c]:
                    return False
        return True

    def _get_observation(self) -> np.ndarray:
        """Get the current observation."""
        obs = np.zeros((2, self.rows, self.cols), dtype=np.float32)

        for r in range(self.rows):
            for c in range(self.cols):
                if self.revealed[r, c]:
                    obs[0, r, c] = self.adjacent_counts[r, c]
                else:
                    obs[0, r, c] = -1  # Hidden

                obs[1, r, c] = 1 if self.flagged[r, c] else 0

        return obs

    def reset(
        self,
        seed: Optional[int] = None,
        options: Optional[Dict] = None
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        """Reset the environment."""
        super().reset(seed=seed)

        self.revealed = np.zeros((self.rows, self.cols), dtype=bool)
        self.flagged = np.zeros((self.rows, self.cols), dtype=bool)
        self.mines = None  # Mines placed on first click
        self.adjacent_counts = None
        self.first_click = True
        self.game_over = False
        self.won = False

        # Return observation with all hidden
        obs = np.ones((2, self.rows, self.cols), dtype=np.float32)
        obs[0, :, :] = -1  # All hidden
        obs[1, :, :] = 0   # None flagged

        return obs, {}

    def step(self, action: int) -> Tuple[np.ndarray, float, bool, bool, Dict[str, Any]]:
        """
        Take a step in the environment.

        Args:
            action: Index of cell to reveal (row * cols + col)

        Returns:
            observation, reward, terminated, truncated, info
        """
        row = action // self.cols
        col = action % self.cols

        reward = 0.0
        terminated = False
        truncated = False
        info = {"hit_mine": False, "cells_revealed": 0, "won": False}

        # Validate action
        if row < 0 or row >= self.rows or col < 0 or col >= self.cols:
            reward = -0.1
            return self._get_observation(), reward, terminated, truncated, info

        # Check if already revealed or flagged
        if self.first_click:
            # Place mines avoiding first click
            self._place_mines(row, col)
            self.first_click = False

        if self.revealed[row, col] or self.flagged[row, col]:
            reward = -0.1  # Small penalty for invalid action
            return self._get_observation(), reward, terminated, truncated, info

        # Check if hit mine
        if self.mines[row, col]:
            self.revealed[row, col] = True
            self.game_over = True
            reward = -10.0
            terminated = True
            info["hit_mine"] = True
            return self._get_observation(), reward, terminated, truncated, info

        # Reveal cell
        cells_revealed = self._reveal_cell(row, col)
        info["cells_revealed"] = cells_revealed

        # Reward based on cells revealed
        if cells_revealed > 1:
            reward = 0.5  # Cascade bonus
        else:
            reward = 0.1  # Single cell

        # Check for win
        if self._check_win():
            self.won = True
            self.game_over = True
            reward = 10.0
            terminated = True
            info["won"] = True

        return self._get_observation(), reward, terminated, truncated, info

    def get_valid_actions(self) -> List[int]:
        """Get list of valid actions (unrevealed, unflagged cells)."""
        valid = []
        for r in range(self.rows):
            for c in range(self.cols):
                if not self.revealed[r, c] and not self.flagged[r, c]:
                    valid.append(r * self.cols + c)
        return valid

    def get_safe_cells(self) -> List[int]:
        """
        Get cells that are definitely safe based on revealed numbers.
        Uses constraint satisfaction logic.
        """
        safe = set()

        for r in range(self.rows):
            for c in range(self.cols):
                if not self.revealed[r, c]:
                    continue

                count = self.adjacent_counts[r, c]
                if count == 0:
                    continue

                # Count hidden and flagged neighbors
                hidden_neighbors = []
                flagged_count = 0

                for dr in range(-1, 2):
                    for dc in range(-1, 2):
                        if dr == 0 and dc == 0:
                            continue
                        nr, nc = r + dr, c + dc
                        if 0 <= nr < self.rows and 0 <= nc < self.cols:
                            if not self.revealed[nr, nc]:
                                if self.flagged[nr, nc]:
                                    flagged_count += 1
                                else:
                                    hidden_neighbors.append((nr, nc))

                # If all mines are accounted for, remaining are safe
                if flagged_count == count:
                    for nr, nc in hidden_neighbors:
                        safe.add(nr * self.cols + nc)

        return list(safe)

    def render(self) -> Optional[str]:
        """Render the environment."""
        if self.render_mode == "ansi":
            return self._render_ansi()
        elif self.render_mode == "human":
            print(self._render_ansi())
        return None

    def _render_ansi(self) -> str:
        """Render as ASCII art."""
        lines = []
        lines.append("  " + " ".join(str(c % 10) for c in range(self.cols)))
        lines.append("  " + "-" * (self.cols * 2 - 1))

        for r in range(self.rows):
            row_str = f"{r % 10}|"
            for c in range(self.cols):
                if self.revealed[r, c]:
                    if self.mines[r, c]:
                        row_str += "*"
                    elif self.adjacent_counts[r, c] == 0:
                        row_str += " "
                    else:
                        row_str += str(self.adjacent_counts[r, c])
                elif self.flagged[r, c]:
                    row_str += "F"
                else:
                    row_str += "."
                row_str += " "
            lines.append(row_str)

        return "\n".join(lines)


# Register the environment
def register_minesweeper_env():
    """Register the Minesweeper environment with Gymnasium."""
    from gymnasium.envs.registration import register

    try:
        register(
            id="Minesweeper-v0",
            entry_point="rl.environments.minesweeper_env:MinesweeperEnv",
            kwargs={"rows": 8, "cols": 8, "num_mines": 10}
        )
    except Exception:
        pass  # Already registered


if __name__ == "__main__":
    # Test the environment
    env = MinesweeperEnv(rows=8, cols=8, num_mines=10, render_mode="human")
    obs, info = env.reset()

    print("Initial board:")
    env.render()
    print()

    # Play a few random moves
    for i in range(5):
        valid_actions = env.get_valid_actions()
        if not valid_actions:
            break

        action = np.random.choice(valid_actions)
        row, col = action // env.cols, action % env.cols
        print(f"Move {i+1}: Reveal ({row}, {col})")

        obs, reward, terminated, truncated, info = env.step(action)
        env.render()
        print(f"Reward: {reward}, Terminated: {terminated}")
        print()

        if terminated:
            if info.get("won"):
                print("WON!")
            elif info.get("hit_mine"):
                print("HIT MINE!")
            break
