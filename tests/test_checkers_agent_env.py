import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import pytest
from backend.rl.agents.checkers_agent import CheckersRLAgent
from backend.rl.environments.checkers_env import CheckersEnv

def test_checkers_agent_vs_env():
    env = CheckersEnv()
    agent = CheckersRLAgent()
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

def test_agent_no_valid_moves():
    env = CheckersEnv()
    agent = CheckersRLAgent()
    env.reset()
    import numpy as np
    env.board = np.zeros((8, 8), dtype=np.int8)
    valid_moves = env._get_all_moves('black')
    assert len(valid_moves) == 0, "No valid moves should be available"
