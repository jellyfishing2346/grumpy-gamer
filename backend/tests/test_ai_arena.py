"""Tests for the AI vs AI match engine and odds pricing (issue #230). No database needed."""
import os
import random
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import ai_arena as A  # noqa: E402


@pytest.mark.parametrize("game", list(A.GAMES))
def test_every_bot_only_makes_legal_moves(game):
    spec = A.GAMES[game]
    for bot_id, (_, bot) in spec["bots"].items():
        for seed in range(5):
            rng = random.Random(seed)
            board = spec["new"]()
            player = 1
            while spec["winner"](board) is None:
                move = bot(board, player, rng)
                if game == "tictactoe":
                    assert move in A.ttt_moves(board), bot_id
                    board[move[0]][move[1]] = player
                else:
                    assert move in A.c4_moves(board), bot_id
                    A.c4_drop(board, move, player)
                player = 3 - player


@pytest.mark.parametrize("game", list(A.GAMES))
def test_matches_are_deterministic_per_seed(game):
    bots = list(A.GAMES[game]["bots"])
    first = A.play_match(game, bots[0], bots[-1], seed=12345)
    again = A.play_match(game, bots[0], bots[-1], seed=12345)
    assert first == again
    results = {A.play_match(game, bots[0], bots[1], seed=s)[0] for s in range(30)}
    assert len(results) > 1, "different seeds should produce different games"


def test_replayed_moves_reproduce_the_result():
    result, moves = A.play_match("connectfour", "greedy_gus", "shallow_sam", seed=7)
    board = A.c4_new()
    for m in moves:
        A.c4_drop(board, m["move"], 1 if m["player"] == "a" else 2)
    assert {1: "a", 2: "b", 0: "draw"}[A.c4_winner(board)] == result


def test_perfect_tictactoe_never_loses():
    for seed in range(100):
        result, _ = A.play_match("tictactoe", "minimax_max", "wobbly_wendy", seed)
        assert result != "b"
        result, _ = A.play_match("tictactoe", "rando", "minimax_max", seed)
        assert result != "a"


def test_connect_four_detects_all_win_directions():
    for cells in ([(5, 0), (5, 1), (5, 2), (5, 3)], [(5, 0), (4, 0), (3, 0), (2, 0)],
                  [(5, 0), (4, 1), (3, 2), (2, 3)], [(2, 0), (3, 1), (4, 2), (5, 3)]):
        board = A.c4_new()
        for r, c in cells:
            board[r][c] = 2
        assert A.c4_winner(board) == 2


def test_every_offered_outcome_favours_the_house():
    """Expected return per coin staked must be below 1 for every outcome we offer."""
    for key in A.eligible_pairings():
        probs = dict(zip(("a", "b", "draw"), A.CALIBRATED_PROBABILITIES[key]))
        for outcome, odds in A.odds_for(*key).items():
            if odds is not None:
                assert probs[outcome] * odds < 1.0, (key, outcome)


def test_impossible_outcomes_are_not_offered():
    for key in A.eligible_pairings():
        probs = dict(zip(("a", "b", "draw"), A.CALIBRATED_PROBABILITIES[key]))
        for outcome, odds in A.odds_for(*key).items():
            if probs[outcome] < A.MIN_OFFERED_PROBABILITY:
                assert odds is None


def test_lopsided_pairings_are_not_scheduled():
    assert A.eligible_pairings()
    for key in A.eligible_pairings():
        assert max(A.CALIBRATED_PROBABILITIES[key]) <= A.MAX_OUTCOME_PROBABILITY
    assert ("tictactoe", "greedy_gus", "minimax_max") not in A.eligible_pairings()  # always a draw


def test_calibration_table_covers_every_pairing():
    for game in A.GAMES:
        bots = list(A.GAMES[game]["bots"])
        for a in bots:
            for b in bots:
                if a != b:
                    assert (game, a, b) in A.CALIBRATED_PROBABILITIES
