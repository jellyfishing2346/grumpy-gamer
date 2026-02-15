import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import pytest
import numpy as np
from backend.rl.agents.connectfour_agent import ConnectFourRLAgent
from backend.rl.environments.connectfour_env import ConnectFourEnv

def test_connectfour_agent_vs_env():
    env = ConnectFourEnv()
    agent = ConnectFourRLAgent()
    env.reset()
    state = env.board.copy()
    move = agent.get_action(state)
    valid_moves = env._get_valid_moves()
    assert move in valid_moves, "Agent should select a valid move"
    next_state, reward, done, truncated, info = env.step(move)
    assert isinstance(next_state, (list, np.ndarray)), "Next state should be a list or ndarray"
    assert isinstance(reward, (int, float)), "Reward should be numeric"
    assert isinstance(done, bool), "Done should be boolean"
    assert isinstance(truncated, bool), "Truncated should be boolean"
    assert isinstance(info, dict), "Info should be a dict"

def test_agent_no_valid_moves():
    env = ConnectFourEnv()
    agent = ConnectFourRLAgent()
    env.reset()
    env.board = [[0]*6 for _ in range(7)]
    state = env.board.copy()
    valid_moves = env._get_valid_moves()
    assert len(valid_moves) == 0, "No valid moves should be available"
    assert len(valid_moves) == 0, "No valid moves should be available"
