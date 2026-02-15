import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import pytest
from backend.rl.agents.game2048_agent import Game2048RLAgent
from backend.rl.environments.game2048_env import Game2048Env

def test_game2048_agent_vs_env():
    env = Game2048Env()
    agent = Game2048RLAgent()
    env.reset()
    state = env.board.copy()
    move = agent.get_action(state)
    assert env.action_space.contains(move), "Agent should select a valid move (0-3)"
    next_state, reward, done, truncated, info = env.step(move)
    import numpy as np
    assert isinstance(next_state, (list, np.ndarray)), "Next state should be a list or ndarray"
    assert isinstance(reward, (int, float)), "Reward should be numeric"
    assert isinstance(done, bool), "Done should be boolean"
    assert isinstance(truncated, bool), "Truncated should be boolean"
    assert isinstance(info, dict), "Info should be a dict"

def test_agent_no_valid_moves():
    env = Game2048Env()
    agent = Game2048RLAgent()
    env.reset()
    import numpy as np
    # Checkerboard of 2 and 4, no merges possible
    board = np.array([[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]], dtype=np.int32)
    env.board = board
    assert env._get_valid_moves().size == 0, "No valid moves should be available"
