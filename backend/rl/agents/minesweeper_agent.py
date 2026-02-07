"""
RL Agent wrapper for Minesweeper

This module provides a clean interface for using trained RL models
to play Minesweeper, including fallback to rule-based AI if no model is available.

Minesweeper is unique because:
1. It's single-player (vs environment, not opponent)
2. Some situations require guessing
3. The RL agent can learn patterns humans miss
"""

import os
import numpy as np
from typing import List, Optional, Tuple, Dict, Any
from pathlib import Path


class MinesweeperRLAgent:
    """
    Minesweeper agent that uses a trained RL model.
    Falls back to rule-based logic if no trained model is available.
    """
    
    def __init__(self, model_path: Optional[str] = None):
        """
        Initialize the RL agent.
        
        Args:
            model_path: Path to the trained model. If None, searches default locations.
        """
        self.model = None
        self.model_loaded = False
        self.model_path = model_path
        
        self._load_model()
    
    def _load_model(self):
        """Attempt to load a trained model."""
        try:
            from stable_baselines3 import PPO
            
            # Search paths for model
            search_paths = []
            
            if self.model_path:
                search_paths.append(self.model_path)
            
            # Default model locations
            base_dir = Path(__file__).parent.parent
            search_paths.extend([
                base_dir / "models" / "minesweeper_best.zip",
                base_dir / "models" / "minesweeper_ppo" / "best_model.zip",
                base_dir / "models" / "minesweeper_ppo" / "final_model.zip",
            ])
            
            for path in search_paths:
                path = Path(path)
                if path.exists():
                    print(f"Loading Minesweeper RL model from: {path}")
                    self.model = PPO.load(str(path))
                    self.model_loaded = True
                    print("Minesweeper RL model loaded successfully!")
                    return
            
            print("No trained Minesweeper RL model found. Using fallback logic.")
            
        except ImportError:
            print("stable_baselines3 not installed. Using fallback logic.")
        except Exception as e:
            print(f"Error loading RL model: {e}. Using fallback logic.")
    
    def board_to_observation(
        self,
        board: List[List[Dict]],
        rows: int,
        cols: int
    ) -> np.ndarray:
        """
        Convert frontend board representation to observation.
        
        Args:
            board: 2D list of cell dictionaries with keys:
                   - state: 'hidden', 'revealed', 'flagged'
                   - adjacentMines: int (0-8 if revealed)
            rows: Number of rows
            cols: Number of columns
            
        Returns:
            Observation array of shape (2, rows, cols)
        """
        obs = np.zeros((2, rows, cols), dtype=np.float32)
        
        for r in range(rows):
            for c in range(cols):
                cell = board[r][c]
                state = cell.get("state", "hidden")
                
                if state == "revealed":
                    obs[0, r, c] = cell.get("adjacentMines", 0)
                else:
                    obs[0, r, c] = -1  # Hidden
                
                obs[1, r, c] = 1 if state == "flagged" else 0
        
        return obs
    
    def get_valid_actions(
        self,
        board: List[List[Dict]],
        rows: int,
        cols: int
    ) -> List[int]:
        """Get list of valid actions (hidden, unflagged cells)."""
        valid = []
        for r in range(rows):
            for c in range(cols):
                cell = board[r][c]
                if cell.get("state") == "hidden":
                    valid.append(r * cols + c)
        return valid
    
    def get_safe_cells(
        self,
        board: List[List[Dict]],
        rows: int,
        cols: int
    ) -> List[int]:
        """
        Find cells that are definitely safe using constraint satisfaction.
        """
        safe = set()
        
        for r in range(rows):
            for c in range(cols):
                cell = board[r][c]
                if cell.get("state") != "revealed":
                    continue
                
                count = cell.get("adjacentMines", 0)
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
                        if 0 <= nr < rows and 0 <= nc < cols:
                            neighbor = board[nr][nc]
                            state = neighbor.get("state")
                            if state == "hidden":
                                hidden_neighbors.append((nr, nc))
                            elif state == "flagged":
                                flagged_count += 1
                
                # If all mines accounted for, remaining are safe
                if flagged_count == count:
                    for nr, nc in hidden_neighbors:
                        safe.add(nr * cols + nc)
        
        return list(safe)
    
    def get_definite_mines(
        self,
        board: List[List[Dict]],
        rows: int,
        cols: int
    ) -> List[int]:
        """
        Find cells that are definitely mines.
        """
        mines = set()
        
        for r in range(rows):
            for c in range(cols):
                cell = board[r][c]
                if cell.get("state") != "revealed":
                    continue
                
                count = cell.get("adjacentMines", 0)
                if count == 0:
                    continue
                
                hidden_neighbors = []
                flagged_count = 0
                
                for dr in range(-1, 2):
                    for dc in range(-1, 2):
                        if dr == 0 and dc == 0:
                            continue
                        nr, nc = r + dr, c + dc
                        if 0 <= nr < rows and 0 <= nc < cols:
                            neighbor = board[nr][nc]
                            state = neighbor.get("state")
                            if state == "hidden":
                                hidden_neighbors.append((nr, nc))
                            elif state == "flagged":
                                flagged_count += 1
                
                # If hidden cells = remaining mines, all are mines
                remaining_mines = count - flagged_count
                if remaining_mines == len(hidden_neighbors) and remaining_mines > 0:
                    for nr, nc in hidden_neighbors:
                        mines.add(nr * cols + nc)
        
        return list(mines)
    
    def _fallback_move(
        self,
        board: List[List[Dict]],
        rows: int,
        cols: int
    ) -> Tuple[int, int]:
        """
        Rule-based fallback when RL model unavailable.
        
        Returns:
            (row, col) of best move
        """
        # First, try safe cells
        safe_cells = self.get_safe_cells(board, rows, cols)
        if safe_cells:
            action = safe_cells[0]
            return action // cols, action % cols
        
        # Get valid hidden cells
        valid = self.get_valid_actions(board, rows, cols)
        if not valid:
            return 0, 0
        
        # Get definite mines to avoid
        mines = set(self.get_definite_mines(board, rows, cols))
        
        # Filter out definite mines
        safe_valid = [a for a in valid if a not in mines]
        if not safe_valid:
            safe_valid = valid  # Must guess
        
        # Prefer corners and edges (statistically safer)
        corners = [a for a in safe_valid 
                   if (a // cols in [0, rows-1]) and (a % cols in [0, cols-1])]
        if corners:
            action = corners[0]
            return action // cols, action % cols
        
        edges = [a for a in safe_valid
                 if (a // cols in [0, rows-1]) or (a % cols in [0, cols-1])]
        if edges:
            action = edges[0]
            return action // cols, action % cols
        
        # Random from safe valid
        action = np.random.choice(safe_valid)
        return action // cols, action % cols
    
    def get_move(
        self,
        board: List[List[Dict]],
        rows: int = 8,
        cols: int = 8
    ) -> Tuple[int, int]:
        """
        Get the best move for the given board state.
        
        Args:
            board: 2D list of cell dictionaries
            rows: Number of rows
            cols: Number of columns
            
        Returns:
            (row, col) of best move to reveal
        """
        move, _ = self.get_move_with_info(board, rows, cols)
        return move
    
    def get_move_with_info(
        self,
        board: List[List[Dict]],
        rows: int = 8,
        cols: int = 8
    ) -> Tuple[Tuple[int, int], bool]:
        """
        Get move with info about whether RL model was used.
        
        Args:
            board: 2D list of cell dictionaries
            rows: Number of rows
            cols: Number of columns
            
        Returns:
            ((row, col), used_rl_model)
        """
        # Always check for safe moves first (these are guaranteed)
        safe_cells = self.get_safe_cells(board, rows, cols)
        if safe_cells:
            action = safe_cells[0]
            row, col = action // cols, action % cols
            return (row, col), self.model_loaded
        
        # If RL model loaded, use it for uncertain situations
        if self.model_loaded and self.model is not None:
            try:
                obs = self.board_to_observation(board, rows, cols)
                obs_flat = obs.flatten()
                
                action, _ = self.model.predict(obs_flat, deterministic=True)
                action = int(action)
                
                row = action // cols
                col = action % cols
                
                # Validate action
                if 0 <= row < rows and 0 <= col < cols:
                    cell = board[row][col]
                    if cell.get("state") == "hidden":
                        return (row, col), True
                
                # RL gave invalid action, fall back
                row, col = self._fallback_move(board, rows, cols)
                return (row, col), False
                
            except Exception as e:
                print(f"RL prediction error: {e}")
                row, col = self._fallback_move(board, rows, cols)
                return (row, col), False
        
        # Fallback to rule-based
        row, col = self._fallback_move(board, rows, cols)
        return (row, col), False
    
    def get_action_info(
        self,
        board: List[List[Dict]],
        rows: int,
        cols: int
    ) -> Dict[str, Any]:
        """
        Get detailed info about the agent's decision.
        
        Returns dict with:
            - safe_cells: List of guaranteed safe cells
            - definite_mines: List of cells that are definitely mines
            - recommended_move: The recommended action
            - confidence: Confidence level (high for safe cells, medium/low otherwise)
        """
        safe_cells = self.get_safe_cells(board, rows, cols)
        definite_mines = self.get_definite_mines(board, rows, cols)
        move, used_rl = self.get_move_with_info(board, rows, cols)
        
        # Determine confidence
        action = move[0] * cols + move[1]
        if action in safe_cells:
            confidence = "high"
        elif action not in definite_mines:
            confidence = "medium"
        else:
            confidence = "low"  # Shouldn't happen
        
        return {
            "safe_cells": [(a // cols, a % cols) for a in safe_cells],
            "definite_mines": [(a // cols, a % cols) for a in definite_mines],
            "recommended_move": move,
            "used_rl_model": used_rl,
            "confidence": confidence
        }


if __name__ == "__main__":
    # Test the agent
    agent = MinesweeperRLAgent()
    
    # Create a simple test board (8x8, all hidden)
    test_board = [
        [{"state": "hidden", "adjacentMines": 0} for _ in range(8)]
        for _ in range(8)
    ]
    
    # Simulate some revealed cells
    test_board[3][3]["state"] = "revealed"
    test_board[3][3]["adjacentMines"] = 1
    test_board[3][4]["state"] = "revealed"
    test_board[3][4]["adjacentMines"] = 0
    
    move, used_rl = agent.get_move_with_info(test_board, 8, 8)
    print(f"Recommended move: {move}")
    print(f"Used RL model: {used_rl}")
    
    info = agent.get_action_info(test_board, 8, 8)
    print(f"Safe cells: {info['safe_cells']}")
    print(f"Confidence: {info['confidence']}")
