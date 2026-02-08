"""
Checkers Gymnasium Environment for Reinforcement Learning

8x8 board with:
- Regular pieces (move forward diagonally)
- Kings (move any diagonal direction)
- Mandatory captures with multi-jump support

Observation: 8x8x4 tensor (empty, player regular, player king, AI regular, AI king)
Action: Encoded as from_pos * 32 + to_pos (simplified action space)
"""

import gymnasium as gym
from gymnasium import spaces
import numpy as np
from typing import Optional, Tuple, List, Dict


class CheckersEnv(gym.Env):
    """
    Checkers environment for training RL agents.

    The agent plays as 'black' (AI) against 'red' (opponent).
    Board encoding:
        0 = empty
        1 = red regular (opponent)
        2 = red king (opponent)
        3 = black regular (agent)
        4 = black king (agent)
    """

    metadata = {"render_modes": ["human", "ansi"], "render_fps": 1}

    BOARD_SIZE = 8
    EMPTY = 0
    RED_REGULAR = 1
    RED_KING = 2
    BLACK_REGULAR = 3
    BLACK_KING = 4

    def __init__(self, opponent_type: str = "random", render_mode: Optional[str] = None):
        super().__init__()

        self.opponent_type = opponent_type
        self.render_mode = render_mode

        # Observation: 8x8 board with 5 possible values
        self.observation_space = spaces.Box(
            low=0, high=4, shape=(self.BOARD_SIZE, self.BOARD_SIZE), dtype=np.int8
        )

        # Action space: we'll use a discrete space for all possible moves
        # Simplified: max 12 pieces * max ~8 possible moves each = ~96 actions
        # We'll use move indexing from the valid moves list
        self.action_space = spaces.Discrete(100)

        self.board = None
        self.current_player = None  # 'black' or 'red'
        self.valid_moves = []
        self.move_count = 0
        self.max_moves = 150  # Prevent infinite games

    def reset(self, seed: Optional[int] = None, options: Optional[dict] = None) -> Tuple[np.ndarray, dict]:
        super().reset(seed=seed)

        self.board = self._create_initial_board()
        self.current_player = 'black'  # Agent moves first
        self.valid_moves = self._get_all_moves('black')
        self.move_count = 0

        return self._get_observation(), {"valid_moves": len(self.valid_moves)}

    def _create_initial_board(self) -> np.ndarray:
        """Create the initial checkers board."""
        board = np.zeros((self.BOARD_SIZE, self.BOARD_SIZE), dtype=np.int8)

        # Place black pieces (agent) at top (rows 0-2)
        for row in range(3):
            for col in range(self.BOARD_SIZE):
                if (row + col) % 2 == 1:
                    board[row, col] = self.BLACK_REGULAR

        # Place red pieces (opponent) at bottom (rows 5-7)
        for row in range(5, 8):
            for col in range(self.BOARD_SIZE):
                if (row + col) % 2 == 1:
                    board[row, col] = self.RED_REGULAR

        return board

    def _get_observation(self) -> np.ndarray:
        """Return the current board state."""
        return self.board.copy()

    def _is_player_piece(self, piece: int, player: str) -> bool:
        """Check if piece belongs to player."""
        if player == 'black':
            return piece in [self.BLACK_REGULAR, self.BLACK_KING]
        else:
            return piece in [self.RED_REGULAR, self.RED_KING]

    def _is_king(self, piece: int) -> bool:
        """Check if piece is a king."""
        return piece in [self.RED_KING, self.BLACK_KING]

    def _get_piece_moves(self, row: int, col: int) -> List[Dict]:
        """Get all valid moves for a single piece."""
        piece = self.board[row, col]
        if piece == self.EMPTY:
            return []

        player = 'black' if piece in [self.BLACK_REGULAR, self.BLACK_KING] else 'red'
        if player == 'black':
            opponent_pieces = [self.RED_REGULAR, self.RED_KING]
        else:
            opponent_pieces = [self.BLACK_REGULAR, self.BLACK_KING]

        # Determine movement directions
        if self._is_king(piece):
            directions = [(-1, -1), (-1, 1), (1, -1), (1, 1)]
        elif player == 'black':
            directions = [(1, -1), (1, 1)]  # Black moves down
        else:
            directions = [(-1, -1), (-1, 1)]  # Red moves up

        moves = []
        capture_moves = []

        # Check captures first
        for dr, dc in [(-1, -1), (-1, 1), (1, -1), (1, 1)]:  # All directions for captures
            if not self._is_king(piece):
                # Regular pieces can only capture in their movement directions (forward)
                if player == 'black' and dr == -1:
                    continue
                if player == 'red' and dr == 1:
                    continue

            mid_row, mid_col = row + dr, col + dc
            end_row, end_col = row + 2*dr, col + 2*dc

            if 0 <= end_row < 8 and 0 <= end_col < 8:
                mid_piece = self.board[mid_row, mid_col]
                end_piece = self.board[end_row, end_col]

                if mid_piece in opponent_pieces and end_piece == self.EMPTY:
                    # Check for multi-jumps
                    will_king = (player == 'black' and end_row == 7) or (player == 'red' and end_row == 0)
                    capture_moves.append({
                        'from': (row, col),
                        'to': (end_row, end_col),
                        'captures': [(mid_row, mid_col)],
                        'is_kinging': will_king
                    })

        if capture_moves:
            return capture_moves

        # Regular moves (only if no captures)
        for dr, dc in directions:
            new_row, new_col = row + dr, col + dc
            if 0 <= new_row < 8 and 0 <= new_col < 8:
                if self.board[new_row, new_col] == self.EMPTY:
                    will_king = (player == 'black' and new_row == 7) or (player == 'red' and new_row == 0)
                    moves.append({
                        'from': (row, col),
                        'to': (new_row, new_col),
                        'captures': [],
                        'is_kinging': will_king
                    })

        return moves

    def _get_all_moves(self, player: str) -> List[Dict]:
        """Get all valid moves for a player."""
        all_moves = []
        capture_moves = []

        for row in range(8):
            for col in range(8):
                piece = self.board[row, col]
                if self._is_player_piece(piece, player):
                    moves = self._get_piece_moves(row, col)
                    for move in moves:
                        if move['captures']:
                            capture_moves.append(move)
                        else:
                            all_moves.append(move)

        # Mandatory capture rule
        return capture_moves if capture_moves else all_moves

    def _apply_move(self, move: Dict) -> None:
        """Apply a move to the board."""
        from_row, from_col = move['from']
        to_row, to_col = move['to']

        piece = self.board[from_row, from_col]

        # Move piece
        self.board[from_row, from_col] = self.EMPTY

        # Handle kinging
        if move['is_kinging']:
            if piece == self.BLACK_REGULAR:
                piece = self.BLACK_KING
            elif piece == self.RED_REGULAR:
                piece = self.RED_KING

        self.board[to_row, to_col] = piece

        # Remove captured pieces
        for cap_row, cap_col in move['captures']:
            self.board[cap_row, cap_col] = self.EMPTY

    def _count_pieces(self, player: str) -> Tuple[int, int]:
        """Count regular pieces and kings for a player."""
        regular = 0
        kings = 0
        pieces = [self.BLACK_REGULAR, self.BLACK_KING] if player == 'black' else [self.RED_REGULAR, self.RED_KING]

        for row in range(8):
            for col in range(8):
                p = self.board[row, col]
                if p == pieces[0]:
                    regular += 1
                elif p == pieces[1]:
                    kings += 1

        return regular, kings

    def _get_opponent_move(self) -> Optional[Dict]:
        """Get opponent's move based on opponent type."""
        moves = self._get_all_moves('red')
        if not moves:
            return None

        if self.opponent_type == "random":
            return moves[self.np_random.choice(len(moves))]
        else:
            # Simple heuristic: prefer captures, then random
            capture_moves = [m for m in moves if m['captures']]
            if capture_moves:
                return capture_moves[self.np_random.choice(len(capture_moves))]
            return moves[self.np_random.choice(len(moves))]

    def step(self, action: int) -> Tuple[np.ndarray, float, bool, bool, dict]:
        """
        Execute one step in the environment.

        Action is an index into the valid_moves list.
        """
        self.move_count += 1

        # Check for valid action
        if not self.valid_moves:
            # Agent has no moves - loses
            return self._get_observation(), -1.0, True, False, {"result": "loss", "reason": "no_moves"}

        if action >= len(self.valid_moves):
            # Invalid action - pick a random valid one but penalize
            action = self.np_random.choice(len(self.valid_moves))
            reward = -0.1
        else:
            reward = 0.0

        # Apply agent's move
        move = self.valid_moves[action]
        captures_made = len(move['captures'])
        self._apply_move(move)

        # Reward for captures
        reward += captures_made * 0.2

        # Reward for kinging
        if move['is_kinging']:
            reward += 0.3

        # Check if opponent has pieces left
        opp_regular, opp_kings = self._count_pieces('red')
        if opp_regular + opp_kings == 0:
            return self._get_observation(), 1.0, True, False, {"result": "win", "reason": "captured_all"}

        # Opponent's turn
        opponent_moves = self._get_all_moves('red')
        if not opponent_moves:
            # Opponent has no moves - agent wins
            return self._get_observation(), 1.0, True, False, {"result": "win", "reason": "opponent_blocked"}

        opp_move = self._get_opponent_move()
        if opp_move:
            opp_captures = len(opp_move['captures'])
            self._apply_move(opp_move)
            reward -= opp_captures * 0.15  # Penalty when opponent captures

        # Check if agent has pieces left
        agent_regular, agent_kings = self._count_pieces('black')
        if agent_regular + agent_kings == 0:
            return self._get_observation(), -1.0, True, False, {"result": "loss", "reason": "all_captured"}

        # Update valid moves for next turn
        self.valid_moves = self._get_all_moves('black')

        if not self.valid_moves:
            return self._get_observation(), -1.0, True, False, {"result": "loss", "reason": "blocked"}

        # Check for max moves (draw)
        if self.move_count >= self.max_moves:
            # Evaluate who's winning
            agent_score = agent_regular + agent_kings * 2
            opp_score = opp_regular + opp_kings * 2
            if agent_score > opp_score:
                return self._get_observation(), 0.5, True, False, {"result": "draw", "reason": "max_moves_ahead"}
            elif agent_score < opp_score:
                return self._get_observation(), -0.5, True, False, {"result": "draw", "reason": "max_moves_behind"}
            return self._get_observation(), 0.0, True, False, {"result": "draw", "reason": "max_moves"}

        return self._get_observation(), reward, False, False, {"valid_moves": len(self.valid_moves)}

    def get_valid_action_mask(self) -> np.ndarray:
        """Return a mask of valid actions."""
        mask = np.zeros(self.action_space.n, dtype=np.int8)
        for i in range(min(len(self.valid_moves), self.action_space.n)):
            mask[i] = 1
        return mask

    def render(self) -> Optional[str]:
        if self.render_mode == "ansi":
            symbols = {
                self.EMPTY: '.',
                self.RED_REGULAR: 'r',
                self.RED_KING: 'R',
                self.BLACK_REGULAR: 'b',
                self.BLACK_KING: 'B'
            }
            lines = []
            lines.append("  0 1 2 3 4 5 6 7")
            for row in range(8):
                line = f"{row} "
                for col in range(8):
                    line += symbols[self.board[row, col]] + " "
                lines.append(line)
            return "\n".join(lines)
        return None


# Register the environment
gym.register(
    id='Checkers-v0',
    entry_point='rl.environments.checkers_env:CheckersEnv',
)
