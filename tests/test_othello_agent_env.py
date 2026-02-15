import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import pytest
from backend.rl.agents.othello_agent import OthelloRLAgent
from backend.rl.environments.othello_env import OthelloEnv

def test_othello_agent_vs_env():
    env = OthelloEnv()
    agent = OthelloRLAgent()
    env.reset()
    state = env.board.copy()
    move = agent.get_action(state)
    valid_moves = env._get_valid_moves()
    assert move in valid_moves, "Agent should select a valid move"
    next_state, reward, done, truncated, info = env.step(move)
    import numpy as np
    assert isinstance(next_state, (list, np.ndarray)), "Next state should be a list or ndarray"
    assert isinstance(reward, (int, float)), "Reward should be numeric"
    assert isinstance(done, bool), "Done should be boolean"
    assert isinstance(truncated, bool), "Truncated should be boolean"
    assert isinstance(info, dict), "Info should be a dict"

def test_agent_no_valid_moves():
    import numpy as np
    env = OthelloEnv()
    agent = OthelloRLAgent()
    env.reset()
    env.board = np.zeros((env.BOARD_SIZE, env.BOARD_SIZE), dtype=np.int32)
    valid_moves = env._get_valid_moves()
    assert len(valid_moves) == 0, "No valid moves should be available"
    env.board = np.zeros((env.BOARD_SIZE, env.BOARD_SIZE), dtype=np.int32)
    valid_moves = env._get_valid_moves()
    assert len(valid_moves) == 0, "No valid moves should be available"
