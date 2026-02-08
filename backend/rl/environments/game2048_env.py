"""
2048 Gymnasium Environment for Reinforcement Learning

This environment implements the 2048 puzzle game as a Gymnasium environment,
suitable for training RL agents using algorithms like PPO or DQN.

Board representation:
- 4x4 grid
- Each cell contains log2 of the tile value (0 for empty, 1 for 2, 2 for 4, etc.)
"""

import gymnasium as gym
from gymnasium import spaces
import numpy as np
from typing import Optional, Tuple, Dict, Any


class Game2048Env(gym.Env):
    """
    2048 environment for reinforcement learning.
    
    Actions are directions: 0=up, 1=right, 2=down, 3=left
    """
    
    metadata = {"render_modes": ["human", "ansi"], "render_fps": 4}
    
    SIZE = 4
    
    # Action mapping
    UP = 0
    RIGHT = 1
    DOWN = 2
    LEFT = 3
    
    def __init__(
        self,
        render_mode: Optional[str] = None,
        target_tile: int = 2048,
    ):
        super().__init__()
        
        self.render_mode = render_mode
        self.target_tile = target_tile
        
        # Observation space: 4x4 grid with log2 values (0-17 for tiles up to 131072)
        self.observation_space = spaces.Box(
            low=0, high=17, shape=(self.SIZE, self.SIZE), dtype=np.float32
        )
        
        # Action space: 4 directions
        self.action_space = spaces.Discrete(4)
        
        # Initialize board
        self.board = None
        self.score = 0
        self.done = False
        self.has_won = False
        
        self.reset()
    
    def _get_obs(self) -> np.ndarray:
        """Convert board to observation (log2 values)."""
        obs = np.zeros((self.SIZE, self.SIZE), dtype=np.float32)
        for r in range(self.SIZE):
            for c in range(self.SIZE):
                if self.board[r, c] > 0:
                    obs[r, c] = np.log2(self.board[r, c])
        return obs
    
    def _get_info(self) -> Dict[str, Any]:
        """Return additional info."""
        return {
            "score": self.score,
            "max_tile": int(np.max(self.board)),
            "has_won": self.has_won,
            "empty_cells": int(np.sum(self.board == 0)),
        }
    
    def _add_random_tile(self):
        """Add a random tile (2 or 4) to an empty cell."""
        empty_cells = np.argwhere(self.board == 0)
        if len(empty_cells) == 0:
            return False
        
        idx = self.np_random.integers(len(empty_cells))
        row, col = empty_cells[idx]
        
        # 90% chance of 2, 10% chance of 4
        value = 2 if self.np_random.random() < 0.9 else 4
        self.board[row, col] = value
        return True
    
    def _slide_row_left(self, row: np.ndarray) -> Tuple[np.ndarray, int]:
        """Slide and merge a row to the left. Returns new row and score gained."""
        # Remove zeros and slide left
        non_zero = row[row != 0]
        new_row = np.zeros(self.SIZE, dtype=np.int32)
        score = 0
        
        write_idx = 0
        skip_next = False
        
        for i in range(len(non_zero)):
            if skip_next:
                skip_next = False
                continue
            
            if i + 1 < len(non_zero) and non_zero[i] == non_zero[i + 1]:
                # Merge
                merged_value = non_zero[i] * 2
                new_row[write_idx] = merged_value
                score += merged_value
                skip_next = True
            else:
                new_row[write_idx] = non_zero[i]
            
            write_idx += 1
        
        return new_row, score
    
    def _rotate_board(self, times: int = 1) -> np.ndarray:
        """Rotate board 90 degrees clockwise."""
        return np.rot90(self.board, -times)
    
    def _move(self, direction: int) -> Tuple[bool, int]:
        """
        Execute a move in the given direction.
        Returns (moved, score_gained).
        """
        # Rotate so we always slide left
        rotations = {
            self.LEFT: 0,
            self.UP: 1,
            self.RIGHT: 2,
            self.DOWN: 3,
        }
        
        rot = rotations[direction]
        self.board = np.rot90(self.board, rot)
        
        moved = False
        total_score = 0
        
        for r in range(self.SIZE):
            old_row = self.board[r].copy()
            new_row, score = self._slide_row_left(self.board[r])
            self.board[r] = new_row
            total_score += score
            
            if not np.array_equal(old_row, new_row):
                moved = True
        
        # Rotate back
        self.board = np.rot90(self.board, -rot)
        
        return moved, total_score
    
    def _can_move(self) -> bool:
        """Check if any move is possible."""
        # Check for empty cells
        if np.any(self.board == 0):
            return True
        
        # Check for possible merges
        for r in range(self.SIZE):
            for c in range(self.SIZE):
                val = self.board[r, c]
                # Check right
                if c < self.SIZE - 1 and self.board[r, c + 1] == val:
                    return True
                # Check down
                if r < self.SIZE - 1 and self.board[r + 1, c] == val:
                    return True
        
        return False
    
    def _check_win(self) -> bool:
        """Check if target tile has been reached."""
        return np.any(self.board >= self.target_tile)
    
    def reset(
        self,
        *,
        seed: Optional[int] = None,
        options: Optional[Dict[str, Any]] = None,
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        """Reset the environment."""
        super().reset(seed=seed)
        
        self.board = np.zeros((self.SIZE, self.SIZE), dtype=np.int32)
        self.score = 0
        self.done = False
        self.has_won = False
        
        # Add two random tiles
        self._add_random_tile()
        self._add_random_tile()
        
        return self._get_obs(), self._get_info()
    
    def step(self, action: int) -> Tuple[np.ndarray, float, bool, bool, Dict[str, Any]]:
        """
        Execute one step in the environment.
        
        Args:
            action: Direction (0=up, 1=right, 2=down, 3=left)
            
        Returns:
            observation, reward, terminated, truncated, info
        """
        if self.done:
            return self._get_obs(), 0.0, True, False, self._get_info()
        
        # Execute move
        moved, score_gained = self._move(action)
        
        reward = 0.0
        
        if moved:
            self.score += score_gained
            reward = score_gained / 100.0  # Normalize reward
            
            # Add new tile
            self._add_random_tile()
            
            # Check for win
            if not self.has_won and self._check_win():
                self.has_won = True
                reward += 100.0  # Big bonus for reaching 2048
        else:
            # Invalid move (nothing moved) - small penalty
            reward = -0.1
        
        # Check for game over
        if not self._can_move():
            self.done = True
            
            # Bonus based on max tile reached
            max_tile = np.max(self.board)
            if max_tile >= 2048:
                reward += 50.0
            elif max_tile >= 1024:
                reward += 20.0
            elif max_tile >= 512:
                reward += 10.0
            elif max_tile >= 256:
                reward += 5.0
        
        return self._get_obs(), reward, self.done, False, self._get_info()
    
    def render(self):
        """Render the current board state."""
        if self.render_mode == "ansi" or self.render_mode == "human":
            print(f"\nScore: {self.score}")
            print("-" * 25)
            for row in self.board:
                row_str = " | ".join(f"{v:4d}" if v > 0 else "    " for v in row)
                print(f"| {row_str} |")
            print("-" * 25)
            
            if self.done:
                if self.has_won:
                    print("You win!")
                else:
                    print("Game over!")
    
    def close(self):
        """Clean up resources."""
        pass


# Register the environment
gym.register(
    id="Game2048-v0",
    entry_point="rl.environments.game2048_env:Game2048Env",
)
