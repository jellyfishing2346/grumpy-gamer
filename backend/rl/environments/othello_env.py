"""
Othello (Reversi) Gymnasium Environment for Reinforcement Learning

This environment implements Othello as a Gymnasium environment,
suitable for training RL agents using algorithms like PPO or DQN.

Board representation:
- 8x8 board
- 0 = empty, 1 = player 1 (agent/black), -1 = player 2 (opponent/white)
"""

import gymnasium as gym
from gymnasium import spaces
import numpy as np
from typing import Optional, Tuple, Dict, Any, List


class OthelloEnv(gym.Env):
    """
    Othello environment for reinforcement learning.
    
    The agent plays as player 1 (black, value=1) and the opponent plays as player 2 (white, value=-1).
    Actions are flattened board positions (0-63) representing where to place a piece.
    """
    
    metadata = {"render_modes": ["human", "ansi"], "render_fps": 4}
    
    BOARD_SIZE = 8
    DIRECTIONS = [
        (-1, -1), (-1, 0), (-1, 1),
        (0, -1),          (0, 1),
        (1, -1),  (1, 0), (1, 1)
    ]
    
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
        
        # Observation space: 8x8 board with 3 channels (empty, player1, player2)
        self.observation_space = spaces.Box(
            low=0, high=1, shape=(3, self.BOARD_SIZE, self.BOARD_SIZE), dtype=np.float32
        )
        
        # Action space: 64 positions (8x8 flattened)
        self.action_space = spaces.Discrete(self.BOARD_SIZE * self.BOARD_SIZE)
        
        # Initialize board
        self.board = None
        self.current_player = 1  # Black starts
        self.done = False
        self.winner = None
        self.consecutive_passes = 0
        
        self.reset()
        
    def _get_obs(self) -> np.ndarray:
        """Convert board to one-hot encoded observation."""
        obs = np.zeros((3, self.BOARD_SIZE, self.BOARD_SIZE), dtype=np.float32)
        obs[0] = (self.board == 0).astype(np.float32)  # Empty cells
        obs[1] = (self.board == 1).astype(np.float32)  # Player 1 (black)
        obs[2] = (self.board == -1).astype(np.float32)  # Player 2 (white)
        return obs
    
    def _get_info(self) -> Dict[str, Any]:
        """Return additional info."""
        return {
            "valid_moves": self._get_valid_moves(),
            "current_player": self.current_player,
            "winner": self.winner,
            "black_count": np.sum(self.board == 1),
            "white_count": np.sum(self.board == -1),
        }
    
    def _is_valid_position(self, row: int, col: int) -> bool:
        """Check if position is within board bounds."""
        return 0 <= row < self.BOARD_SIZE and 0 <= col < self.BOARD_SIZE
    
    def _get_flippable_pieces(self, row: int, col: int, player: int) -> List[Tuple[int, int]]:
        """Get list of pieces that would be flipped by placing at (row, col)."""
        if self.board[row, col] != 0:
            return []
        
        opponent = -player
        all_flippable = []
        
        for dr, dc in self.DIRECTIONS:
            flippable = []
            r, c = row + dr, col + dc
            
            # Move in direction while finding opponent pieces
            while self._is_valid_position(r, c) and self.board[r, c] == opponent:
                flippable.append((r, c))
                r += dr
                c += dc
            
            # Check if we ended on our own piece (valid flip)
            if flippable and self._is_valid_position(r, c) and self.board[r, c] == player:
                all_flippable.extend(flippable)
        
        return all_flippable
    
    def _is_valid_move(self, row: int, col: int, player: int) -> bool:
        """Check if a move is valid."""
        return len(self._get_flippable_pieces(row, col, player)) > 0
    
    def _get_valid_moves(self, player: int = None) -> np.ndarray:
        """Get array of valid move indices for current or specified player."""
        if player is None:
            player = self.current_player
        
        valid = []
        for row in range(self.BOARD_SIZE):
            for col in range(self.BOARD_SIZE):
                if self._is_valid_move(row, col, player):
                    valid.append(row * self.BOARD_SIZE + col)
        return np.array(valid, dtype=np.int32)
    
    def _make_move(self, row: int, col: int, player: int) -> bool:
        """Make a move and flip pieces. Returns True if successful."""
        flippable = self._get_flippable_pieces(row, col, player)
        
        if not flippable:
            return False
        
        self.board[row, col] = player
        for r, c in flippable:
            self.board[r, c] = player
        
        return True
    
    def _check_game_over(self) -> Tuple[bool, Optional[int]]:
        """Check if game is over and return winner."""
        # Game ends if both players have no valid moves
        player1_moves = len(self._get_valid_moves(1))
        player2_moves = len(self._get_valid_moves(-1))
        
        if player1_moves == 0 and player2_moves == 0:
            black_count = np.sum(self.board == 1)
            white_count = np.sum(self.board == -1)
            
            if black_count > white_count:
                return True, 1  # Black wins
            elif white_count > black_count:
                return True, -1  # White wins
            else:
                return True, 0  # Tie
        
        return False, None
    
    def _get_opponent_move(self) -> Optional[int]:
        """Get opponent's move based on opponent type."""
        valid_moves = self._get_valid_moves(-1)  # Opponent is player -1
        
        if len(valid_moves) == 0:
            return None  # Pass
        
        if self.opponent_type == "random":
            return np.random.choice(valid_moves)
        elif self.opponent_type == "minimax":
            return self._minimax_move(valid_moves)
        elif self.opponent_type == "self":
            # For self-play, just use random (the model will be used externally)
            return np.random.choice(valid_moves)
        else:
            return np.random.choice(valid_moves)
    
    def _minimax_move(self, valid_moves: np.ndarray, depth: int = 3) -> int:
        """Simple minimax with position weights."""
        # Position weights for Othello (corners are valuable)
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
        
        def evaluate(board: np.ndarray, player: int) -> float:
            """Evaluate board position for player."""
            score = 0
            # Weighted position score
            for r in range(8):
                for c in range(8):
                    if board[r, c] == player:
                        score += WEIGHTS[r, c]
                    elif board[r, c] == -player:
                        score -= WEIGHTS[r, c]
            # Piece count
            score += np.sum(board == player) - np.sum(board == -player)
            return score
        
        best_move = valid_moves[0]
        best_score = -float('inf')
        
        for move in valid_moves:
            row, col = move // self.BOARD_SIZE, move % self.BOARD_SIZE
            
            # Simulate move
            test_board = self.board.copy()
            flippable = self._get_flippable_pieces(row, col, -1)  # Opponent is -1
            test_board[row, col] = -1
            for r, c in flippable:
                test_board[r, c] = -1
            
            score = evaluate(test_board, -1)  # Evaluate for opponent
            
            if score > best_score:
                best_score = score
                best_move = move
        
        return best_move
    
    def reset(
        self,
        *,
        seed: Optional[int] = None,
        options: Optional[Dict[str, Any]] = None,
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        """Reset the environment."""
        super().reset(seed=seed)
        
        # Initialize empty board
        self.board = np.zeros((self.BOARD_SIZE, self.BOARD_SIZE), dtype=np.int8)
        
        # Set up initial 4 pieces in center
        mid = self.BOARD_SIZE // 2
        self.board[mid - 1, mid - 1] = -1  # White
        self.board[mid - 1, mid] = 1       # Black
        self.board[mid, mid - 1] = 1       # Black
        self.board[mid, mid] = -1          # White
        
        self.current_player = 1  # Black starts
        self.done = False
        self.winner = None
        self.consecutive_passes = 0
        
        # If opponent starts, make their move first
        if self.opponent_starts:
            self.current_player = -1
            opponent_action = self._get_opponent_move()
            if opponent_action is not None:
                row, col = opponent_action // self.BOARD_SIZE, opponent_action % self.BOARD_SIZE
                self._make_move(row, col, -1)
            self.current_player = 1
        
        return self._get_obs(), self._get_info()
    
    def step(self, action: int) -> Tuple[np.ndarray, float, bool, bool, Dict[str, Any]]:
        """
        Execute one step in the environment.
        
        Args:
            action: Flattened board position (0-63)
            
        Returns:
            observation, reward, terminated, truncated, info
        """
        if self.done:
            return self._get_obs(), 0.0, True, False, self._get_info()
        
        row, col = action // self.BOARD_SIZE, action % self.BOARD_SIZE
        valid_moves = self._get_valid_moves(1)
        
        reward = 0.0
        
        # Check if action is valid
        if len(valid_moves) > 0:
            if action not in valid_moves:
                # Invalid move penalty - pick a random valid move instead
                reward = -0.5
                action = np.random.choice(valid_moves)
                row, col = action // self.BOARD_SIZE, action % self.BOARD_SIZE
            
            # Make the move
            pieces_before = np.sum(self.board == 1)
            self._make_move(row, col, 1)
            pieces_after = np.sum(self.board == 1)
            
            # Small reward for flipping pieces
            flipped = pieces_after - pieces_before - 1  # -1 for the placed piece
            reward += flipped * 0.1
            
            # Bonus for corners
            if (row, col) in [(0, 0), (0, 7), (7, 0), (7, 7)]:
                reward += 2.0
            
            self.consecutive_passes = 0
        else:
            # No valid moves - pass
            self.consecutive_passes += 1
        
        # Check if game is over
        game_over, winner = self._check_game_over()
        
        if game_over:
            self.done = True
            self.winner = winner
            
            if winner == 1:
                reward += 10.0  # Win bonus
            elif winner == -1:
                reward -= 10.0  # Loss penalty
            # Tie: no additional reward
            
            return self._get_obs(), reward, True, False, self._get_info()
        
        # Opponent's turn
        self.current_player = -1
        opponent_valid = self._get_valid_moves(-1)
        
        if len(opponent_valid) > 0:
            opponent_action = self._get_opponent_move()
            if opponent_action is not None:
                opp_row, opp_col = opponent_action // self.BOARD_SIZE, opponent_action % self.BOARD_SIZE
                self._make_move(opp_row, opp_col, -1)
                self.consecutive_passes = 0
        else:
            self.consecutive_passes += 1
        
        self.current_player = 1
        
        # Check again after opponent move
        game_over, winner = self._check_game_over()
        
        if game_over:
            self.done = True
            self.winner = winner
            
            if winner == 1:
                reward += 10.0
            elif winner == -1:
                reward -= 10.0
        
        return self._get_obs(), reward, self.done, False, self._get_info()
    
    def render(self):
        """Render the current board state."""
        if self.render_mode == "ansi" or self.render_mode == "human":
            symbols = {0: ".", 1: "●", -1: "○"}
            print("\n  0 1 2 3 4 5 6 7")
            for i, row in enumerate(self.board):
                row_str = " ".join(symbols[cell] for cell in row)
                print(f"{i} {row_str}")
            
            black = np.sum(self.board == 1)
            white = np.sum(self.board == -1)
            print(f"\nBlack: {black}, White: {white}")
            
            if self.done:
                if self.winner == 1:
                    print("Black wins!")
                elif self.winner == -1:
                    print("White wins!")
                else:
                    print("It's a tie!")
    
    def close(self):
        """Clean up resources."""
        pass


# Register the environment
gym.register(
    id="Othello-v0",
    entry_point="rl.environments.othello_env:OthelloEnv",
)
