"""
RL Agent wrapper for Tic-Tac-Toe

This module provides a clean interface for using trained RL models
to play Tic-Tac-Toe, including fallback to rule-based AI if no model is available.
"""

import os
import numpy as np
from typing import List, Optional, Tuple
from pathlib import Path


class TicTacToeRLAgent:
    """
    Tic-Tac-Toe agent that uses a trained RL model.
    Falls back to minimax if no trained model is available.
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
                base_dir / "models" / "tictactoe_best.zip",
                base_dir / "models" / "tictactoe_ppo_curriculum" / "final_model.zip",
                base_dir / "models" / "tictactoe_ppo_curriculum" / "final_model",
                base_dir / "models" / "tictactoe_ppo_random" / "best_model.zip",
                base_dir / "models" / "tictactoe_ppo_random" / "final_model.zip",
            ])
            
            for path in search_paths:
                path = Path(path)
                if path.exists() or Path(f"{path}.zip").exists():
                    print(f"Loading RL model from: {path}")
                    self.model = PPO.load(str(path))
                    self.model_loaded = True
                    print("RL model loaded successfully!")
                    return
            
            print("No trained RL model found. Using fallback minimax.")
            
        except ImportError:
            print("stable_baselines3 not installed. Using fallback minimax.")
        except Exception as e:
            print(f"Error loading RL model: {e}. Using fallback minimax.")
    
    def get_move(self, board: List[int], player: int = 1) -> int:
        """
        Get the best move for the given board state.
        
        Args:
            board: List of 9 integers representing the board
                   (0=empty, 1=X, -1=O or use player value)
            player: Which player the agent is (1 for X, -1 for O)
            
        Returns:
            Index of the best move (0-8)
        """
        # Convert board to numpy array
        board_array = np.array(board, dtype=np.float32)
        
        # If agent is O (-1), flip the board perspective
        if player == -1:
            board_array = -board_array
        
        # Get valid moves
        valid_moves = np.where(board_array == 0)[0]
        
        if len(valid_moves) == 0:
            raise ValueError("No valid moves available")
        
        if self.model_loaded and self.model is not None:
            return self._get_rl_move(board_array, valid_moves)
        else:
            return self._get_minimax_move(board_array.tolist(), player)
    
    def _get_rl_move(self, board: np.ndarray, valid_moves: np.ndarray) -> int:
        """Get move from RL model with action masking."""
        # Get action from model
        action, _ = self.model.predict(board, deterministic=True)
        action = int(action)
        
        # If the action is valid, use it
        if action in valid_moves:
            return action
        
        # If action is invalid, choose the valid action with highest Q-value
        # This is a safety fallback
        return int(np.random.choice(valid_moves))
    
    def _get_minimax_move(self, board: List[float], player: int) -> int:
        """Fallback minimax implementation."""
        best_score = float('-inf')
        best_move = None
        
        for i in range(9):
            if board[i] == 0:
                board[i] = player
                score = self._minimax(board, 0, False, player, float('-inf'), float('inf'))
                board[i] = 0
                
                if score > best_score:
                    best_score = score
                    best_move = i
        
        if best_move is None:
            # No moves available, this shouldn't happen
            valid = [i for i in range(9) if board[i] == 0]
            return valid[0] if valid else 0
        
        return best_move
    
    def load_model(self, model_path: str) -> bool:
        """
        Load a trained model from a specific path.
        
        Args:
            model_path: Path to the trained model file
            
        Returns:
            True if model loaded successfully, False otherwise
        """
        try:
            from stable_baselines3 import PPO
            
            if os.path.exists(model_path):
                print(f"Loading RL model from: {model_path}")
                self.model = PPO.load(model_path)
                self.model_loaded = True
                self.model_path = model_path
                print("RL model loaded successfully!")
                return True
            else:
                print(f"Model file not found: {model_path}")
                return False
                
        except ImportError:
            print("stable_baselines3 not installed.")
            return False
        except Exception as e:
            print(f"Error loading model: {e}")
            return False
    
    def get_action(self, board: List[List[int]]) -> int:
        """
        Get action for a 2D board (used by API).
        
        Args:
            board: 3x3 board where 0=empty, 1=player, 2=AI
            
        Returns:
            Action index (0-8)
        """
        # Convert 2D board to 1D and adjust values (2 -> -1 for AI)
        flat_board = []
        for row in board:
            for cell in row:
                if cell == 0:
                    flat_board.append(0)
                elif cell == 1:
                    flat_board.append(1)
                else:  # cell == 2 (AI)
                    flat_board.append(-1)
        
        # AI plays as -1
        return self.get_move(flat_board, player=-1)
    
    def get_action_with_info(self, board: List[List[int]]) -> Tuple[int, bool]:
        """
        Get action for a 2D board with info about which method was used.
        
        Args:
            board: 3x3 board where 0=empty, 1=player, 2=AI
            
        Returns:
            Tuple of (action index 0-8, used_rl_model boolean)
        """
        action = self.get_action(board)
        return action, self.model_loaded
    
    def _minimax(
        self,
        board: List[float],
        depth: int,
        is_maximizing: bool,
        player: int,
        alpha: float,
        beta: float
    ) -> float:
        """Minimax with alpha-beta pruning."""
        winner = self._check_winner(board)
        
        if winner == player:
            return 10 - depth
        elif winner == -player:
            return depth - 10
        elif all(cell != 0 for cell in board):
            return 0
        
        if is_maximizing:
            max_score = float('-inf')
            for i in range(9):
                if board[i] == 0:
                    board[i] = player
                    score = self._minimax(board, depth + 1, False, player, alpha, beta)
                    board[i] = 0
                    max_score = max(max_score, score)
                    alpha = max(alpha, score)
                    if beta <= alpha:
                        break
            return max_score
        else:
            min_score = float('inf')
            for i in range(9):
                if board[i] == 0:
                    board[i] = -player
                    score = self._minimax(board, depth + 1, True, player, alpha, beta)
                    board[i] = 0
                    min_score = min(min_score, score)
                    beta = min(beta, score)
                    if beta <= alpha:
                        break
            return min_score
    
    def _check_winner(self, board: List[float]) -> Optional[int]:
        """Check if there's a winner."""
        lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],  # Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8],  # Columns
            [0, 4, 8], [2, 4, 6]               # Diagonals
        ]
        
        for line in lines:
            values = [board[i] for i in line]
            if values[0] != 0 and values[0] == values[1] == values[2]:
                return int(values[0])
        
        return None
    
    @property
    def is_rl_model(self) -> bool:
        """Check if using RL model or fallback."""
        return self.model_loaded


# Singleton instance for easy access
_agent_instance: Optional[TicTacToeRLAgent] = None


def get_agent() -> TicTacToeRLAgent:
    """Get the singleton agent instance."""
    global _agent_instance
    if _agent_instance is None:
        _agent_instance = TicTacToeRLAgent()
    return _agent_instance


def get_rl_move(board: List[int], player: int = 1) -> int:
    """
    Convenience function to get a move from the RL agent.
    
    Args:
        board: List of 9 integers (0=empty, 1=X, -1=O)
        player: Which player the agent is (1 or -1)
        
    Returns:
        Index of the best move (0-8)
    """
    agent = get_agent()
    return agent.get_move(board, player)


if __name__ == "__main__":
    # Test the agent
    agent = TicTacToeRLAgent()
    
    print(f"Using RL model: {agent.is_rl_model}")
    
    # Test on empty board
    board = [0, 0, 0, 0, 0, 0, 0, 0, 0]
    move = agent.get_move(board, 1)
    print(f"Move on empty board: {move}")
    
    # Test on partially filled board
    board = [1, 0, -1, 0, 1, 0, 0, 0, -1]
    move = agent.get_move(board, 1)
    print(f"Move on partial board: {move}")
