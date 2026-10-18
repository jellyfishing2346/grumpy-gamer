"""
AI vs AI match engine for prediction markets (issue #230).

Pure Python with no ML dependencies, so matches can be simulated inside a
request on a small server. Every match is fully determined by its seed: the
server stores a secret seed when the match opens and only plays the game out
after betting closes, so nobody (including the client) can know the result in
advance, and the replay is reproducible for auditing.

Run `python ai_arena.py` to re-calibrate the odds table after changing a bot.
"""
import random
from functools import lru_cache
from typing import Callable, Dict, List, Optional, Tuple

Board = List[List[int]]  # 0 = empty, 1 = bot A (moves first), 2 = bot B


# ─── Tic-Tac-Toe ──────────────────────────────────────────────────────────────

TTT_LINES = [
    [(0, 0), (0, 1), (0, 2)], [(1, 0), (1, 1), (1, 2)], [(2, 0), (2, 1), (2, 2)],
    [(0, 0), (1, 0), (2, 0)], [(0, 1), (1, 1), (2, 1)], [(0, 2), (1, 2), (2, 2)],
    [(0, 0), (1, 1), (2, 2)], [(0, 2), (1, 1), (2, 0)],
]


def ttt_new() -> Board:
    return [[0] * 3 for _ in range(3)]


def ttt_moves(board: Board) -> List[Tuple[int, int]]:
    return [(r, c) for r in range(3) for c in range(3) if board[r][c] == 0]


def ttt_winner(board: Board) -> Optional[int]:
    """Return 1 or 2 for a winner, 0 for a draw, None if the game continues."""
    for line in TTT_LINES:
        a, b, c = (board[r][col] for r, col in line)
        if a and a == b == c:
            return a
    return 0 if not ttt_moves(board) else None


@lru_cache(maxsize=None)
def _ttt_minimax_cached(cells: Tuple[int, ...], player: int, me: int) -> int:
    board = [list(cells[i:i + 3]) for i in (0, 3, 6)]
    result = ttt_winner(board)
    if result is not None:
        return 0 if result == 0 else (1 if result == me else -1)
    scores = []
    for r, c in ttt_moves(board):
        board[r][c] = player
        scores.append(_ttt_minimax_cached(tuple(v for row in board for v in row), 3 - player, me))
        board[r][c] = 0
    return max(scores) if player == me else min(scores)


def _ttt_minimax(board: Board, player: int, me: int) -> int:
    return _ttt_minimax_cached(tuple(v for row in board for v in row), player, me)


def _ttt_immediate(board: Board, player: int) -> Optional[Tuple[int, int]]:
    for r, c in ttt_moves(board):
        board[r][c] = player
        won = ttt_winner(board) == player
        board[r][c] = 0
        if won:
            return (r, c)
    return None


def ttt_random(board: Board, player: int, rng: random.Random):
    return rng.choice(ttt_moves(board))


def ttt_greedy(board: Board, player: int, rng: random.Random):
    """Win if possible, block if necessary, otherwise prefer centre/corners."""
    move = _ttt_immediate(board, player) or _ttt_immediate(board, 3 - player)
    if move:
        return move
    moves = ttt_moves(board)
    if (1, 1) in moves:
        return (1, 1)
    corners = [m for m in moves if m[0] != 1 and m[1] != 1]
    return rng.choice(corners or moves)


def ttt_perfect(board: Board, player: int, rng: random.Random):
    best, best_moves = -2, []
    for r, c in ttt_moves(board):
        board[r][c] = player
        score = _ttt_minimax(board, 3 - player, player)
        board[r][c] = 0
        if score > best:
            best, best_moves = score, [(r, c)]
        elif score == best:
            best_moves.append((r, c))
    return rng.choice(best_moves)


def ttt_wobbly(board: Board, player: int, rng: random.Random):
    """Perfect play, except 35% of moves are random."""
    if rng.random() < 0.35:
        return ttt_random(board, player, rng)
    return ttt_perfect(board, player, rng)


# ─── Connect Four ─────────────────────────────────────────────────────────────

C4_ROWS, C4_COLS = 6, 7


def c4_new() -> Board:
    return [[0] * C4_COLS for _ in range(C4_ROWS)]


def c4_moves(board: Board) -> List[int]:
    return [c for c in range(C4_COLS) if board[0][c] == 0]


def c4_drop(board: Board, col: int, player: int) -> int:
    for r in range(C4_ROWS - 1, -1, -1):
        if board[r][col] == 0:
            board[r][col] = player
            return r
    raise ValueError("column full")


def _c4_is_win_at(board: Board, r: int, c: int) -> bool:
    p = board[r][c]
    for dr, dc in ((0, 1), (1, 0), (1, 1), (1, -1)):
        count = 1
        for sign in (1, -1):
            rr, cc = r + dr * sign, c + dc * sign
            while 0 <= rr < C4_ROWS and 0 <= cc < C4_COLS and board[rr][cc] == p:
                count += 1
                rr += dr * sign
                cc += dc * sign
        if count >= 4:
            return True
    return False


def c4_winner(board: Board) -> Optional[int]:
    for r in range(C4_ROWS):
        for c in range(C4_COLS):
            if board[r][c] and _c4_is_win_at(board, r, c):
                return board[r][c]
    return 0 if not c4_moves(board) else None


def _c4_immediate(board: Board, player: int) -> Optional[int]:
    for c in c4_moves(board):
        r = c4_drop(board, c, player)
        won = _c4_is_win_at(board, r, c)
        board[r][c] = 0
        if won:
            return c
    return None


def _c4_window_score(window: List[int], player: int) -> int:
    mine, theirs, empty = window.count(player), window.count(3 - player), window.count(0)
    if mine == 3 and empty == 1:
        return 5
    if mine == 2 and empty == 2:
        return 2
    if theirs == 3 and empty == 1:
        return -4
    return 0


def _c4_evaluate(board: Board, player: int) -> int:
    score = 3 * sum(1 for r in range(C4_ROWS) if board[r][3] == player)
    for r in range(C4_ROWS):
        for c in range(C4_COLS):
            for dr, dc in ((0, 1), (1, 0), (1, 1), (1, -1)):
                end_r, end_c = r + 3 * dr, c + 3 * dc
                if 0 <= end_r < C4_ROWS and 0 <= end_c < C4_COLS:
                    window = [board[r + i * dr][c + i * dc] for i in range(4)]
                    score += _c4_window_score(window, player)
    return score


def _c4_alphabeta(board, depth, alpha, beta, to_move, me, last) -> float:
    if last is not None and _c4_is_win_at(board, *last):
        return 10_000 + depth if board[last[0]][last[1]] == me else -10_000 - depth
    moves = c4_moves(board)
    if not moves:
        return 0
    if depth == 0:
        return _c4_evaluate(board, me)
    moves.sort(key=lambda c: abs(3 - c))  # centre first prunes more
    if to_move == me:
        value = float("-inf")
        for c in moves:
            r = c4_drop(board, c, to_move)
            value = max(value, _c4_alphabeta(board, depth - 1, alpha, beta, 3 - to_move, me, (r, c)))
            board[r][c] = 0
            alpha = max(alpha, value)
            if alpha >= beta:
                break
        return value
    value = float("inf")
    for c in moves:
        r = c4_drop(board, c, to_move)
        value = min(value, _c4_alphabeta(board, depth - 1, alpha, beta, 3 - to_move, me, (r, c)))
        board[r][c] = 0
        beta = min(beta, value)
        if alpha >= beta:
            break
    return value


def _c4_search(board: Board, player: int, rng: random.Random, depth: int) -> int:
    best, best_moves = float("-inf"), []
    for c in c4_moves(board):
        r = c4_drop(board, c, player)
        score = _c4_alphabeta(board, depth - 1, float("-inf"), float("inf"), 3 - player, player, (r, c))
        board[r][c] = 0
        if score > best:
            best, best_moves = score, [c]
        elif score == best:
            best_moves.append(c)
    return rng.choice(best_moves)


def c4_random(board: Board, player: int, rng: random.Random):
    return rng.choice(c4_moves(board))


def c4_greedy(board: Board, player: int, rng: random.Random):
    move = _c4_immediate(board, player)
    if move is None:
        move = _c4_immediate(board, 3 - player)
    if move is not None:
        return move
    moves = c4_moves(board)
    weights = [4 - abs(3 - c) for c in moves]  # lean towards the centre
    return rng.choices(moves, weights=weights)[0]


def c4_shallow(board: Board, player: int, rng: random.Random):
    return _c4_search(board, player, rng, depth=2)


def c4_steady(board: Board, player: int, rng: random.Random):
    return _c4_search(board, player, rng, depth=3)


def c4_deep(board: Board, player: int, rng: random.Random):
    return _c4_search(board, player, rng, depth=4)


def c4_wobbly(board: Board, player: int, rng: random.Random):
    """Deep search, except 30% of moves are random."""
    if rng.random() < 0.30:
        return c4_random(board, player, rng)
    return c4_deep(board, player, rng)


# ─── Registry ─────────────────────────────────────────────────────────────────

Bot = Callable[[Board, int, random.Random], object]

GAMES: Dict[str, dict] = {
    "tictactoe": {
        "label": "Tic-Tac-Toe",
        "new": ttt_new,
        "winner": ttt_winner,
        "bots": {
            "rando": ("Rando", ttt_random),
            "greedy_gus": ("Greedy Gus", ttt_greedy),
            "wobbly_wendy": ("Wobbly Wendy", ttt_wobbly),
            "minimax_max": ("Minimax Max", ttt_perfect),
        },
    },
    "connectfour": {
        "label": "Connect Four",
        "new": c4_new,
        "winner": c4_winner,
        "bots": {
            "rando": ("Rando", c4_random),
            "greedy_gus": ("Greedy Gus", c4_greedy),
            "shallow_sam": ("Shallow Sam", c4_shallow),
            "steady_steve": ("Steady Steve", c4_steady),
            "wobbly_wanda": ("Wobbly Wanda", c4_wobbly),
            "deep_diana": ("Deep Diana", c4_deep),
        },
    },
}


def bot_name(game: str, bot: str) -> str:
    return GAMES[game]["bots"][bot][0]


def play_match(game: str, bot_a: str, bot_b: str, seed: int) -> Tuple[str, List[dict]]:
    """
    Play one deterministic match. Bot A moves first.
    Returns (result, moves) where result is "a", "b" or "draw" and each move is
    {"player": "a"|"b", "move": ...} so the frontend can replay it.
    """
    spec = GAMES[game]
    rng = random.Random(seed)
    board = spec["new"]()
    bots = {1: spec["bots"][bot_a][1], 2: spec["bots"][bot_b][1]}
    moves: List[dict] = []
    player = 1
    while spec["winner"](board) is None:
        move = bots[player](board, player, rng)
        if game == "tictactoe":
            r, c = move
            board[r][c] = player
            moves.append({"player": "a" if player == 1 else "b", "move": [r, c]})
        else:
            c4_drop(board, move, player)
            moves.append({"player": "a" if player == 1 else "b", "move": move})
        player = 3 - player
    result = spec["winner"](board)
    return {1: "a", 2: "b", 0: "draw"}[result], moves


# ─── Odds ─────────────────────────────────────────────────────────────────────

# Outcome probabilities (bot A wins, bot B wins, draw) per ordered pairing,
# measured by simulating CALIBRATION_SAMPLES[game] seeded matches with
# `python ai_arena.py`. Bot A always moves first, so (x, y) != (y, x).
# Re-run the script and paste its output here after changing any bot.
CALIBRATION_SAMPLES = {"tictactoe": 2000, "connectfour": 200}
CALIBRATED_PROBABILITIES: Dict[Tuple[str, str, str], Tuple[float, float, float]] = {
    ('tictactoe', 'rando', 'greedy_gus'): (0.015, 0.852, 0.134),
    ('tictactoe', 'rando', 'wobbly_wendy'): (0.209, 0.579, 0.212),
    ('tictactoe', 'rando', 'minimax_max'): (0.0, 0.786, 0.213),
    ('tictactoe', 'greedy_gus', 'rando'): (0.955, 0.0, 0.045),
    ('tictactoe', 'greedy_gus', 'wobbly_wendy'): (0.544, 0.0, 0.456),
    ('tictactoe', 'greedy_gus', 'minimax_max'): (0.0, 0.0, 1.0),
    ('tictactoe', 'wobbly_wendy', 'rando'): (0.866, 0.074, 0.059),
    ('tictactoe', 'wobbly_wendy', 'greedy_gus'): (0.112, 0.365, 0.523),
    ('tictactoe', 'wobbly_wendy', 'minimax_max'): (0.0, 0.346, 0.653),
    ('tictactoe', 'minimax_max', 'rando'): (0.972, 0.0, 0.029),
    ('tictactoe', 'minimax_max', 'greedy_gus'): (0.201, 0.0, 0.799),
    ('tictactoe', 'minimax_max', 'wobbly_wendy'): (0.576, 0.0, 0.424),
    ('connectfour', 'rando', 'greedy_gus'): (0.03, 0.97, 0.0),
    ('connectfour', 'rando', 'shallow_sam'): (0.0, 1.0, 0.0),
    ('connectfour', 'rando', 'steady_steve'): (0.0, 1.0, 0.0),
    ('connectfour', 'rando', 'wobbly_wanda'): (0.04, 0.96, 0.0),
    ('connectfour', 'rando', 'deep_diana'): (0.0, 1.0, 0.0),
    ('connectfour', 'greedy_gus', 'rando'): (0.97, 0.03, 0.0),
    ('connectfour', 'greedy_gus', 'shallow_sam'): (0.04, 0.96, 0.0),
    ('connectfour', 'greedy_gus', 'steady_steve'): (0.03, 0.965, 0.005),
    ('connectfour', 'greedy_gus', 'wobbly_wanda'): (0.31, 0.67, 0.02),
    ('connectfour', 'greedy_gus', 'deep_diana'): (0.005, 0.995, 0.0),
    ('connectfour', 'shallow_sam', 'rando'): (1.0, 0.0, 0.0),
    ('connectfour', 'shallow_sam', 'greedy_gus'): (0.985, 0.015, 0.0),
    ('connectfour', 'shallow_sam', 'steady_steve'): (0.26, 0.66, 0.08),
    ('connectfour', 'shallow_sam', 'wobbly_wanda'): (0.845, 0.15, 0.005),
    ('connectfour', 'shallow_sam', 'deep_diana'): (0.385, 0.615, 0.0),
    ('connectfour', 'steady_steve', 'rando'): (1.0, 0.0, 0.0),
    ('connectfour', 'steady_steve', 'greedy_gus'): (0.995, 0.005, 0.0),
    ('connectfour', 'steady_steve', 'shallow_sam'): (1.0, 0.0, 0.0),
    ('connectfour', 'steady_steve', 'wobbly_wanda'): (0.91, 0.09, 0.0),
    ('connectfour', 'steady_steve', 'deep_diana'): (0.465, 0.535, 0.0),
    ('connectfour', 'wobbly_wanda', 'rando'): (0.995, 0.005, 0.0),
    ('connectfour', 'wobbly_wanda', 'greedy_gus'): (0.735, 0.255, 0.01),
    ('connectfour', 'wobbly_wanda', 'shallow_sam'): (0.355, 0.64, 0.005),
    ('connectfour', 'wobbly_wanda', 'steady_steve'): (0.42, 0.575, 0.005),
    ('connectfour', 'wobbly_wanda', 'deep_diana'): (0.11, 0.885, 0.005),
    ('connectfour', 'deep_diana', 'rando'): (1.0, 0.0, 0.0),
    ('connectfour', 'deep_diana', 'greedy_gus'): (1.0, 0.0, 0.0),
    ('connectfour', 'deep_diana', 'shallow_sam'): (0.72, 0.21, 0.07),
    ('connectfour', 'deep_diana', 'steady_steve'): (1.0, 0.0, 0.0),
    ('connectfour', 'deep_diana', 'wobbly_wanda'): (0.925, 0.075, 0.0),
}

HOUSE_EDGE = 0.05
MIN_ODDS, MAX_ODDS = 1.05, 15.0
MIN_OFFERED_PROBABILITY = 0.01  # outcomes rarer than this aren't offered at all
MAX_OUTCOME_PROBABILITY = 0.88  # pairings this lopsided aren't scheduled


def decimal_odds(probability: float, samples: int) -> Optional[float]:
    """
    Odds for one outcome, or None if it's too unlikely to offer.

    Priced off a pessimistic estimate (probability + 2 standard errors) and
    then the house edge, so sampling noise in the calibration can't give
    bettors a positive expected return.
    """
    if probability < MIN_OFFERED_PROBABILITY:
        return None
    std_error = (probability * (1 - probability) / samples) ** 0.5
    cautious = min(1.0, probability + 2 * std_error)
    return round(min(MAX_ODDS, max(MIN_ODDS, (1 - HOUSE_EDGE) / cautious)), 2)


def odds_for(game: str, bot_a: str, bot_b: str) -> Dict[str, Optional[float]]:
    probs = CALIBRATED_PROBABILITIES[(game, bot_a, bot_b)]
    n = CALIBRATION_SAMPLES[game]
    return {k: decimal_odds(p, n) for k, p in zip(("a", "b", "draw"), probs)}


def eligible_pairings() -> List[Tuple[str, str, str]]:
    return sorted(k for k, probs in CALIBRATED_PROBABILITIES.items() if max(probs) <= MAX_OUTCOME_PROBABILITY)


def calibrate(game: str, samples: int) -> Dict[Tuple[str, str, str], Tuple[float, float, float]]:
    table = {}
    bots = list(GAMES[game]["bots"])
    for a in bots:
        for b in bots:
            if a == b:
                continue
            counts = {"a": 0, "b": 0, "draw": 0}
            for seed in range(samples):
                result, _ = play_match(game, a, b, seed)
                counts[result] += 1
            table[(game, a, b)] = tuple(round(counts[k] / samples, 3) for k in ("a", "b", "draw"))
    return table


if __name__ == "__main__":  # pragma: no cover
    for game_name, n in CALIBRATION_SAMPLES.items():
        for key, value in calibrate(game_name, n).items():
            print(f"    {key!r}: {value!r},")
