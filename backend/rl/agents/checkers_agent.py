"""
Checkers RL Agent Wrapper

Provides a simple interface for using trained Checkers RL models.
Includes Minimax fallback when model is not available.
"""

import os
import numpy as np
from typing import Optional, Tuple, List, Dict, Any


class CheckersRLAgent:
    """
    Agent wrapper for Checkers RL model.
    
    Handles model loading, action masking, and provides
    a Minimax fallback for when the model is unavailable.
    """
    
    BOARD_SIZE = 8
    EMPTY = 0
    RED_REGULAR = 1
    RED_KING = 2
    BLACK_REGULAR = 3
    BLACK_KING = 4
    
    def __init__(self, model_path: Optional[str] = None):
        """
        Initialize the agent.
        
        Args:
            model_path: Path to trained model. If None, uses default location.
        """
        self.model = None
        self.model_path = model_path or os.path.join(
            os.path.dirname(__file__), "..", "models", "checkers_best.zip"
        )
        
        self._load_model()
    
    def _load_model(self) -> bool:
        """Attempt to load the trained model."""
        try:
            from stable_baselines3 import PPO
            
            if os.path.exists(self.model_path):
                print(f"Loading Checkers RL model from: {self.model_path}")
                self.model = PPO.load(self.model_path)
                print("Checkers RL model loaded successfully!")
                return True
            else:
                print(f"Checkers model not found at: {self.model_path}")
                return False
        except ImportError:
            print("stable-baselines3 not installed, using Minimax fallback")
            return False
        except Exception as e:
            print(f"Error loading Checkers model: {e}")
            return False
    
    def _board_to_observation(self, board: List[List[int]]) -> np.ndarray:
        """
        Convert frontend board format to observation.
        
        Frontend format: 
            0 = empty
            1 = red regular (player)
            2 = red king (player)
            3 = black regular (AI)
            4 = black king (AI)
        """
        return np.array(board, dtype=np.int8)
    
    def _is_player_piece(self, piece: int, player: str) -> bool:
        """Check if piece belongs to player."""
        if player == 'black':
            return piece in [self.BLACK_REGULAR, self.BLACK_KING]
        else:
            return piece in [self.RED_REGULAR, self.RED_KING]
    
    def _is_king(self, piece: int) -> bool:
        """Check if piece is a king."""
        return piece in [self.RED_KING, self.BLACK_KING]
    
    def _get_piece_moves(self, board: np.ndarray, row: int, col: int) -> List[Dict]:
        """Get all valid moves for a single piece."""
        piece = board[row, col]
        if piece == self.EMPTY:
            return []
        
        player = 'black' if piece in [self.BLACK_REGULAR, self.BLACK_KING] else 'red'
        opponent_pieces = [self.RED_REGULAR, self.RED_KING] if player == 'black' else [self.BLACK_REGULAR, self.BLACK_KING]
        
        # Determine movement directions
        if self._is_king(piece):
            directions = [(-1, -1), (-1, 1), (1, -1), (1, 1)]
        elif player == 'black':
            directions = [(1, -1), (1, 1)]  # Black moves down
        else:
            directions = [(-1, -1), (-1, 1)]  # Red moves up
        
        moves = []
        capture_moves = []
        
        # Check captures first (all directions for capturing)
        for dr, dc in [(-1, -1), (-1, 1), (1, -1), (1, 1)]:
            if not self._is_king(piece):
                if player == 'black' and dr == -1:
                    continue
                if player == 'red' and dr == 1:
                    continue
            
            mid_row, mid_col = row + dr, col + dc
            end_row, end_col = row + 2*dr, col + 2*dc
            
            if 0 <= end_row < 8 and 0 <= end_col < 8:
                mid_piece = board[mid_row, mid_col]
                end_piece = board[end_row, end_col]
                
                if mid_piece in opponent_pieces and end_piece == self.EMPTY:
                    will_king = (player == 'black' and end_row == 7) or (player == 'red' and end_row == 0)
                    capture_moves.append({
                        'from': (row, col),
                        'to': (end_row, end_col),
                        'captures': [(mid_row, mid_col)],
                        'is_kinging': will_king
                    })
        
        if capture_moves:
            return capture_moves
        
        # Regular moves
        for dr, dc in directions:
            new_row, new_col = row + dr, col + dc
            if 0 <= new_row < 8 and 0 <= new_col < 8:
                if board[new_row, new_col] == self.EMPTY:
                    will_king = (player == 'black' and new_row == 7) or (player == 'red' and new_row == 0)
                    moves.append({
                        'from': (row, col),
                        'to': (new_row, new_col),
                        'captures': [],
                        'is_kinging': will_king
                    })
        
        return moves
    
    def _get_all_moves(self, board: np.ndarray, player: str) -> List[Dict]:
        """Get all valid moves for a player."""
        all_moves = []
        capture_moves = []
        
        for row in range(8):
            for col in range(8):
                piece = board[row, col]
                if self._is_player_piece(piece, player):
                    moves = self._get_piece_moves(board, row, col)
                    for move in moves:
                        if move['captures']:
                            capture_moves.append(move)
                        else:
                            all_moves.append(move)
        
        # Mandatory capture rule
        return capture_moves if capture_moves else all_moves
    
    def _apply_move(self, board: np.ndarray, move: Dict) -> np.ndarray:
        """Apply a move to the board."""
        new_board = board.copy()
        from_row, from_col = move['from']
        to_row, to_col = move['to']
        
        piece = new_board[from_row, from_col]
        new_board[from_row, from_col] = self.EMPTY
        
        # Handle kinging
        if move['is_kinging']:
            if piece == self.BLACK_REGULAR:
                piece = self.BLACK_KING
            elif piece == self.RED_REGULAR:
                piece = self.RED_KING
        
        new_board[to_row, to_col] = piece
        
        # Remove captured pieces
        for cap_row, cap_col in move['captures']:
            new_board[cap_row, cap_col] = self.EMPTY
        
        return new_board
    
    def _evaluate_board(self, board: np.ndarray) -> float:
        """Evaluate board position for Minimax."""
        black_regular = np.sum(board == self.BLACK_REGULAR)
        black_kings = np.sum(board == self.BLACK_KING)
        red_regular = np.sum(board == self.RED_REGULAR)
        red_kings = np.sum(board == self.RED_KING)
        
        black_score = black_regular * 100 + black_kings * 300
        red_score = red_regular * 100 + red_kings * 300
        
        return black_score - red_score
    
    def _minimax(self, board: np.ndarray, depth: int, alpha: float, beta: float, 
                 maximizing: bool) -> Tuple[float, Optional[Dict]]:
        """Minimax with alpha-beta pruning."""
        player = 'black' if maximizing else 'red'
        moves = self._get_all_moves(board, player)
        
        if not moves:
            return (-100000 if maximizing else 100000), None
        
        if depth == 0:
            return self._evaluate_board(board), None
        
        best_move = None
        
        if maximizing:
            max_eval = float('-inf')
            for move in moves:
                new_board = self._apply_move(board, move)
                eval_score, _ = self._minimax(new_board, depth - 1, alpha, beta, False)
                if eval_score > max_eval:
                    max_eval = eval_score
                    best_move = move
                alpha = max(alpha, eval_score)
                if beta <= alpha:
                    break
            return max_eval, best_move
        else:
            min_eval = float('inf')
            for move in moves:
                new_board = self._apply_move(board, move)
                eval_score, _ = self._minimax(new_board, depth - 1, alpha, beta, True)
                if eval_score < min_eval:
                    min_eval = eval_score
                    best_move = move
                beta = min(beta, eval_score)
                if beta <= alpha:
                    break
            return min_eval, best_move
    
    def _get_minimax_action(self, board: np.ndarray, depth: int = 4) -> Optional[Dict]:
        """Get best move using Minimax."""
        _, best_move = self._minimax(board, depth, float('-inf'), float('inf'), True)
        return best_move
    
    def get_action(self, board: List[List[int]]) -> Optional[Dict]:
        """
        Get the best action for the current board state.
        
        Returns the move dictionary with 'from', 'to', 'captures'.
        """
        move, _ = self.get_action_with_info(board)
        return move
    
    def get_action_with_info(self, board: List[List[int]]) -> Tuple[Optional[Dict], bool]:
        """
        Get action and whether the RL model was used.
        
        Returns:
            Tuple of (move_dict, used_rl_model)
        """
        obs = self._board_to_observation(board)
        valid_moves = self._get_all_moves(obs, 'black')
        
        if not valid_moves:
            return None, False
        
        if self.model is not None:
            try:
                # Model expects (8, 8) observation, not flattened
                action, _ = self.model.predict(obs, deterministic=True)
                action = int(action)
                
                # Ensure action is within valid range
                if action < len(valid_moves):
                    return valid_moves[action], True
                else:
                    # Model gave invalid action, use first valid move
                    return valid_moves[0], True
            except Exception as e:
                print(f"RL model prediction error: {e}")
        
        # Fallback to Minimax
        best_move = self._get_minimax_action(obs, depth=4)
        if best_move:
            return best_move, False
        
        # Last resort: return first valid move
        return valid_moves[0], False
