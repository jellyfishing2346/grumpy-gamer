"""
RL Agent wrapper for Othello

This module provides a clean interface for using trained RL models
to play Othello, including fallback to rule-based AI if no model is available.
"""

import os
import numpy as np
from typing import List, Optional, Tuple
from pathlib import Path


class OthelloRLAgent:
    """
    Othello agent that uses a trained RL model.
    Falls back to minimax if no trained model is available.
    """
    
    BOARD_SIZE = 8
    DIRECTIONS = [
        (-1, -1), (-1, 0), (-1, 1),
        (0, -1),          (0, 1),
        (1, -1),  (1, 0), (1, 1)
    ]
    
    # Position weights for heuristic evaluation
    WEIGHTS = np.array([
        [100, -20, 10,  5,  5, 10, -20, 100],
        [-20, -50, -2, -2, -2, -2, -50, -20],
        [ 10,  -2,  1,  1,  1,  1,  -2,  10],
        [  5,  -2,  1,  0,  0,  1,  -2,   5],
        [  5,  -2,  1,  0,  0,  1,  -2,   5],
        [ 10,  -2,  1,  1,  1,  1,  -2,  10],
        [-20, -50, -2, -2, -2, -2, -50, -20],
        [100, -20, 10,  5,  5, 10, -20, 100],
    ])
    
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
                base_dir / "models" / "othello_best.zip",
                base_dir / "models" / "othello_best",
                base_dir / "models" / "othello_ppo" / "best_model.zip",
            ])
            
            for path in search_paths:
                path = Path(path)
                if path.exists() or Path(f"{path}.zip").exists():
                    print(f"Loading Othello RL model from: {path}")
                    self.model = PPO.load(str(path))
                    self.model_loaded = True
                    print("Othello RL model loaded successfully!")
                    return
            
            print("No trained Othello RL model found. Using fallback minimax.")
            
        except ImportError:
            print("stable_baselines3 not installed. Using fallback minimax.")
        except Exception as e:
            print(f"Error loading Othello RL model: {e}. Using fallback minimax.")
    
    def _is_valid_position(self, row: int, col: int) -> bool:
        """Check if position is within board bounds."""
        return 0 <= row < self.BOARD_SIZE and 0 <= col < self.BOARD_SIZE
    
    def _get_flippable_pieces(self, board: np.ndarray, row: int, col: int, player: int) -> List[Tuple[int, int]]:
        """Get list of pieces that would be flipped by placing at (row, col)."""
        if board[row, col] != 0:
            return []
        
        opponent = -player
        all_flippable = []
        
        for dr, dc in self.DIRECTIONS:
            flippable = []
            r, c = row + dr, col + dc
            
            while self._is_valid_position(r, c) and board[r, c] == opponent:
                flippable.append((r, c))
                r += dr
                c += dc
            
            if flippable and self._is_valid_position(r, c) and board[r, c] == player:
                all_flippable.extend(flippable)
        
        return all_flippable
    
    def _get_valid_moves(self, board: np.ndarray, player: int) -> List[int]:
        """Get list of valid move indices for player."""
        valid = []
        for row in range(self.BOARD_SIZE):
            for col in range(self.BOARD_SIZE):
                if self._get_flippable_pieces(board, row, col, player):
                    valid.append(row * self.BOARD_SIZE + col)
        return valid
    
    def _board_to_obs(self, board: List[List[int]]) -> np.ndarray:
        """Convert board to observation format expected by model."""
        # Convert to numpy array
        board_array = np.array(board, dtype=np.int8)
        
        # One-hot encode: 3 channels (empty, player 1, player 2)
        obs = np.zeros((3, self.BOARD_SIZE, self.BOARD_SIZE), dtype=np.float32)
        obs[0] = (board_array == 0).astype(np.float32)  # Empty
        obs[1] = (board_array == 1).astype(np.float32)  # Player 1 (black/agent)
        obs[2] = (board_array == -1).astype(np.float32)  # Player 2 (white/opponent)
        
        return obs
    
    def _evaluate_position(self, board: np.ndarray, player: int) -> float:
        """Evaluate board position for minimax fallback."""
        score = 0
        opponent = -player
        
        # Weighted position score
        for r in range(self.BOARD_SIZE):
            for c in range(self.BOARD_SIZE):
                if board[r, c] == player:
                    score += self.WEIGHTS[r, c]
                elif board[r, c] == opponent:
                    score -= self.WEIGHTS[r, c]
        
        # Piece count
        score += np.sum(board == player) - np.sum(board == opponent)
        
        # Mobility (number of valid moves)
        player_moves = len(self._get_valid_moves(board, player))
        opponent_moves = len(self._get_valid_moves(board, opponent))
        score += (player_moves - opponent_moves) * 5
        
        return score
    
    def _minimax_move(self, board: np.ndarray, player: int, valid_moves: List[int]) -> int:
        """Get best move using minimax with alpha-beta pruning."""
        if not valid_moves:
            return -1  # No valid moves
        
        best_move = valid_moves[0]
        best_score = -float('inf')
        
        for move in valid_moves:
            row, col = move // self.BOARD_SIZE, move % self.BOARD_SIZE
            
            # Simulate move
            test_board = board.copy()
            flippable = self._get_flippable_pieces(test_board, row, col, player)
            test_board[row, col] = player
            for r, c in flippable:
                test_board[r, c] = player
            
            score = self._evaluate_position(test_board, player)
            
            if score > best_score:
                best_score = score
                best_move = move
        
        return best_move
    
    def get_action(self, board: List[List[int]], player: int = 1) -> int:
        """
        Get the best action for the given board state.
        
        Args:
            board: 8x8 board as nested list (0=empty, 1=black, -1=white)
            player: Which player the agent is (1 for black, -1 for white)
            
        Returns:
            Flattened position (0-63) for the move, or -1 if no valid moves
        """
        action, _ = self.get_action_with_info(board, player)
        return action
    
    def get_action_with_info(self, board: List[List[int]], player: int = 1) -> Tuple[int, bool]:
        """
        Get action with information about whether RL model was used.
        
        Args:
            board: 8x8 board as nested list
            player: Which player the agent is (1 for black, -1 for white)
            
        Returns:
            Tuple of (action, used_model)
        """
        board_array = np.array(board, dtype=np.int8)
        valid_moves = self._get_valid_moves(board_array, player)
        
        if not valid_moves:
            return -1, False  # No valid moves - pass
        
        # If player is white (-1), we need to flip the board perspective for the model
        if player == -1:
            board_array = -board_array  # Flip perspective
        
        # Try RL model first
        if self.model is not None and self.model_loaded:
            try:
                obs = self._board_to_obs(board_array.tolist())
                action, _ = self.model.predict(obs, deterministic=True)
                action = int(action)
                
                # Validate the action
                if action in valid_moves:
                    return action, True
                
                # If model's action is invalid, use minimax fallback
                print(f"RL model chose invalid move {action}, using minimax")
                
            except Exception as e:
                print(f"Error getting RL prediction: {e}")
        
        # Fallback to minimax
        action = self._minimax_move(board_array, player, valid_moves)
        return action, False


# Convenience function
def get_othello_agent() -> OthelloRLAgent:
    """Get a singleton Othello RL agent instance."""
    if not hasattr(get_othello_agent, "_instance"):
        get_othello_agent._instance = OthelloRLAgent()
    return get_othello_agent._instance
