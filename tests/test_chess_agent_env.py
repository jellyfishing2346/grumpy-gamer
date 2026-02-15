import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import pytest
from backend.rl.agents.chess_agent import ChessRLAgent
from backend.rl.environments.chess_env import ChessEnv

def test_chess_agent_vs_env():
    env = ChessEnv()
    agent = ChessRLAgent()
    env.reset()
    state = env.board.copy()
    move = agent.get_action(state)
    valid_moves = env.valid_moves
    assert move in valid_moves, "Agent should select a valid move dict from valid_moves"
    next_state, reward, done, truncated, info = env.step(move)
    import numpy as np
    assert isinstance(next_state, (list, np.ndarray)), "Next state should be a list or ndarray"
    assert isinstance(reward, (int, float)), "Reward should be numeric"
    assert isinstance(done, bool), "Done should be boolean"
    assert isinstance(truncated, bool), "Truncated should be boolean"
    assert isinstance(info, dict), "Info should be a dict"

def test_agent_checkmate():
    env = ChessEnv()
    agent = ChessRLAgent()
    env.reset()
    # Simulate checkmate not implemented; skip for now
    pass
