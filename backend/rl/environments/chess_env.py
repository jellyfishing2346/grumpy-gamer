"""
Chess Gymnasium Environment for Reinforcement Learning

Chess is a complex game with a large state space. This environment provides
a simplified approach for RL training with reasonable action space encoding.

Note: Chess RL is challenging and typically requires significant training.
The agent will primarily rely on Minimax fallback for strong play.
"""

import gymnasium as gym
from gymnasium import spaces
import numpy as np
from typing import Optional, Tuple, List, Dict


class ChessEnv(gym.Env):
    """
    Simplified Chess environment for RL training.

    Piece encoding:
        0 = empty
        1-6 = white pieces (pawn, knight, bishop, rook, queen, king)
        7-12 = black pieces (pawn, knight, bishop, rook, queen, king)

    The agent plays as black (AI) against white (opponent).
    """

    metadata = {"render_modes": ["human", "ansi"], "render_fps": 1}

    # Piece type indices
    EMPTY = 0
    W_PAWN, W_KNIGHT, W_BISHOP, W_ROOK, W_QUEEN, W_KING = 1, 2, 3, 4, 5, 6
    B_PAWN, B_KNIGHT, B_BISHOP, B_ROOK, B_QUEEN, B_KING = 7, 8, 9, 10, 11, 12

    PIECE_VALUES = {
        1: 100, 2: 320, 3: 330, 4: 500, 5: 900, 6: 20000,
        7: 100, 8: 320, 9: 330, 10: 500, 11: 900, 12: 20000
    }

    def __init__(self, opponent_type: str = "random", render_mode: Optional[str] = None):
        super().__init__()

        self.opponent_type = opponent_type
        self.render_mode = render_mode

        # Observation: 8x8 board
        self.observation_space = spaces.Box(
            low=0, high=12, shape=(8, 8), dtype=np.int8
        )

        # Action space: simplified to move index (we'll generate valid moves)
        self.action_space = spaces.Discrete(200)  # Max possible moves

        self.board = None
        self.valid_moves = []
        self.move_count = 0
        self.max_moves = 100  # Limit game length

    def reset(self, seed: Optional[int] = None, options: Optional[dict] = None) -> Tuple[np.ndarray, dict]:
        super().reset(seed=seed)

        self.board = self._create_initial_board()
        self.valid_moves = self._get_all_moves('black')
        self.move_count = 0

        return self._get_observation(), {"valid_moves": len(self.valid_moves)}

    def _create_initial_board(self) -> np.ndarray:
        """Create initial chess position."""
        board = np.zeros((8, 8), dtype=np.int8)

        # White pieces (bottom, rows 6-7)
        board[7] = [self.W_ROOK, self.W_KNIGHT, self.W_BISHOP, self.W_QUEEN,
                    self.W_KING, self.W_BISHOP, self.W_KNIGHT, self.W_ROOK]
        board[6] = [self.W_PAWN] * 8

        # Black pieces (top, rows 0-1)
        board[0] = [self.B_ROOK, self.B_KNIGHT, self.B_BISHOP, self.B_QUEEN,
                    self.B_KING, self.B_BISHOP, self.B_KNIGHT, self.B_ROOK]
        board[1] = [self.B_PAWN] * 8

        return board

    def _get_observation(self) -> np.ndarray:
        return self.board.copy()

    def _is_white(self, piece: int) -> bool:
        return 1 <= piece <= 6

    def _is_black(self, piece: int) -> bool:
        return 7 <= piece <= 12

    def _is_player_piece(self, piece: int, player: str) -> bool:
        if player == 'white':
            return self._is_white(piece)
        return self._is_black(piece)

    def _get_piece_moves(self, row: int, col: int) -> List[Dict]:
        """Get all pseudo-legal moves for a piece (doesn't check for check)."""
        piece = self.board[row, col]
        if piece == self.EMPTY:
            return []

        moves = []
        is_white = self._is_white(piece)
        piece_type = piece if is_white else piece - 6

        # Pawn moves
        if piece_type == 1:  # Pawn
            direction = -1 if is_white else 1
            start_row = 6 if is_white else 1

            # Forward move
            new_row = row + direction
            if 0 <= new_row < 8 and self.board[new_row, col] == self.EMPTY:
                moves.append({'from': (row, col), 'to': (new_row, col)})
                # Double move from start
                if row == start_row:
                    new_row2 = row + 2 * direction
                    if self.board[new_row2, col] == self.EMPTY:
                        moves.append({'from': (row, col), 'to': (new_row2, col)})

            # Captures
            for dc in [-1, 1]:
                new_col = col + dc
                if 0 <= new_row < 8 and 0 <= new_col < 8:
                    target = self.board[new_row, new_col]
                    if target != self.EMPTY and self._is_white(target) != is_white:
                        moves.append({'from': (row, col), 'to': (new_row, new_col)})

        # Knight moves
        elif piece_type == 2:
            knight_moves = [
                (-2, -1), (-2, 1), (-1, -2), (-1, 2),
                (1, -2), (1, 2), (2, -1), (2, 1)
            ]
            for dr, dc in knight_moves:
                nr, nc = row + dr, col + dc
                if 0 <= nr < 8 and 0 <= nc < 8:
                    target = self.board[nr, nc]
                    if target == self.EMPTY or self._is_white(target) != is_white:
                        moves.append({'from': (row, col), 'to': (nr, nc)})

        # Bishop moves
        elif piece_type == 3:
            for dr, dc in [(-1, -1), (-1, 1), (1, -1), (1, 1)]:
                for dist in range(1, 8):
                    nr, nc = row + dr*dist, col + dc*dist
                    if not (0 <= nr < 8 and 0 <= nc < 8):
                        break
                    target = self.board[nr, nc]
                    if target == self.EMPTY:
                        moves.append({'from': (row, col), 'to': (nr, nc)})
                    elif self._is_white(target) != is_white:
                        moves.append({'from': (row, col), 'to': (nr, nc)})
                        break
                    else:
                        break

        # Rook moves
        elif piece_type == 4:
            for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                for dist in range(1, 8):
                    nr, nc = row + dr*dist, col + dc*dist
                    if not (0 <= nr < 8 and 0 <= nc < 8):
                        break
                    target = self.board[nr, nc]
                    if target == self.EMPTY:
                        moves.append({'from': (row, col), 'to': (nr, nc)})
                    elif self._is_white(target) != is_white:
                        moves.append({'from': (row, col), 'to': (nr, nc)})
                        break
                    else:
                        break

        # Queen moves (rook + bishop)
        elif piece_type == 5:
            queen_moves = [
                (-1, -1), (-1, 0), (-1, 1), (0, -1),
                (0, 1), (1, -1), (1, 0), (1, 1)
            ]
            for dr, dc in queen_moves:
                for dist in range(1, 8):
                    nr, nc = row + dr*dist, col + dc*dist
                    if not (0 <= nr < 8 and 0 <= nc < 8):
                        break
                    target = self.board[nr, nc]
                    if target == self.EMPTY:
                        moves.append({'from': (row, col), 'to': (nr, nc)})
                    elif self._is_white(target) != is_white:
                        moves.append({'from': (row, col), 'to': (nr, nc)})
                        break
                    else:
                        break

        # King moves
        elif piece_type == 6:
            for dr in [-1, 0, 1]:
                for dc in [-1, 0, 1]:
                    if dr == 0 and dc == 0:
                        continue
                    nr, nc = row + dr, col + dc
                    if 0 <= nr < 8 and 0 <= nc < 8:
                        target = self.board[nr, nc]
                        if target == self.EMPTY or self._is_white(target) != is_white:
                            moves.append({'from': (row, col), 'to': (nr, nc)})

        return moves

    def _get_all_moves(self, player: str) -> List[Dict]:
        """Get all pseudo-legal moves for a player."""
        moves = []
        for row in range(8):
            for col in range(8):
                piece = self.board[row, col]
                if self._is_player_piece(piece, player):
                    moves.extend(self._get_piece_moves(row, col))
        return moves

    def _apply_move(self, move: Dict) -> None:
        """Apply a move to the board."""
        from_row, from_col = move['from']
        to_row, to_col = move['to']

        piece = self.board[from_row, from_col]
        self.board[from_row, from_col] = self.EMPTY

        # Handle pawn promotion (auto-promote to queen)
        if (piece == self.W_PAWN and to_row == 0) or (piece == self.B_PAWN and to_row == 7):
            piece = self.W_QUEEN if self._is_white(piece) else self.B_QUEEN

        self.board[to_row, to_col] = piece

    def _find_king(self, player: str) -> Optional[Tuple[int, int]]:
        """Find the king position for a player."""
        king = self.W_KING if player == 'white' else self.B_KING
        for row in range(8):
            for col in range(8):
                if self.board[row, col] == king:
                    return (row, col)
        return None

    def _count_material(self, player: str) -> int:
        """Count total material for a player."""
        total = 0
        for row in range(8):
            for col in range(8):
                piece = self.board[row, col]
                if self._is_player_piece(piece, player):
                    total += self.PIECE_VALUES.get(piece, 0)
        return total

    def _get_opponent_move(self) -> Optional[Dict]:
        """Get opponent's move."""
        moves = self._get_all_moves('white')
        if not moves:
            return None

        if self.opponent_type == "random":
            return moves[self.np_random.choice(len(moves))]
        else:
            # Simple heuristic: prefer captures
            captures = []
            for m in moves:
                to_row, to_col = m['to']
                if self.board[to_row, to_col] != self.EMPTY:
                    captures.append(m)
            if captures:
                return captures[self.np_random.choice(len(captures))]
            return moves[self.np_random.choice(len(moves))]

    def step(self, action: int) -> Tuple[np.ndarray, float, bool, bool, dict]:
        """Execute one step."""
        self.move_count += 1

        if not self.valid_moves:
            return self._get_observation(), -1.0, True, False, {"result": "loss"}

        # Validate action is in valid_moves
        if action not in self.valid_moves:
            move = self.np_random.choice(self.valid_moves)
            reward = -0.05
        else:
            move = action
            reward = 0.0

        to_row, to_col = move['to']
        captured = self.board[to_row, to_col]
        self._apply_move(move)

        # Reward for captures
        if captured != self.EMPTY:
            reward += self.PIECE_VALUES.get(captured, 0) / 1000.0

        # Check if opponent's king is captured (win)
        if self._find_king('white') is None:
            return self._get_observation(), 1.0, True, False, {"result": "win"}

        # Opponent's turn
        opponent_moves = self._get_all_moves('white')
        if not opponent_moves:
            return self._get_observation(), 1.0, True, False, {"result": "win"}

        opp_move = self._get_opponent_move()
        if opp_move:
            to_row, to_col = opp_move['to']
            opp_captured = self.board[to_row, to_col]
            self._apply_move(opp_move)
            if opp_captured != self.EMPTY:
                reward -= self.PIECE_VALUES.get(opp_captured, 0) / 1000.0

        # Check if agent's king is captured (loss)
        if self._find_king('black') is None:
            return self._get_observation(), -1.0, True, False, {"result": "loss"}

        # Update valid moves
        self.valid_moves = self._get_all_moves('black')

        if not self.valid_moves:
            return self._get_observation(), -1.0, True, False, {"result": "loss"}

        # Max moves check
        if self.move_count >= self.max_moves:
            black_material = self._count_material('black')
            white_material = self._count_material('white')
            if black_material > white_material:
                return self._get_observation(), 0.5, True, False, {"result": "draw_ahead"}
            elif black_material < white_material:
                return self._get_observation(), -0.5, True, False, {"result": "draw_behind"}
            return self._get_observation(), 0.0, True, False, {"result": "draw"}

        return self._get_observation(), reward, False, False, {"valid_moves": len(self.valid_moves)}

    def render(self) -> Optional[str]:
        if self.render_mode == "ansi":
            symbols = {
                0: '.', 1: 'P', 2: 'N', 3: 'B', 4: 'R', 5: 'Q', 6: 'K',
                7: 'p', 8: 'n', 9: 'b', 10: 'r', 11: 'q', 12: 'k'
            }
            lines = ["  a b c d e f g h"]
            for row in range(8):
                line = f"{8-row} "
                for col in range(8):
                    line += symbols[self.board[row, col]] + " "
                lines.append(line)
            return "\n".join(lines)
        return None


gym.register(
    id='Chess-v0',
    entry_point='rl.environments.chess_env:ChessEnv',
)
