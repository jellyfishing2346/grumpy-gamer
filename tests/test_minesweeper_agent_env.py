import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import pytest
from backend.rl.agents.minesweeper_agent import MinesweeperRLAgent
from backend.rl.environments.minesweeper_env import MinesweeperEnv

def test_minesweeper_agent_vs_env():
    env = MinesweeperEnv()
    agent = MinesweeperRLAgent()
    env.reset()
    obs, _ = env.reset()
    move = agent.get_action(obs)
    valid_actions = env.get_valid_actions()
    assert move in valid_actions, "Agent should select a valid action"
    next_state, reward, done, truncated, info = env.step(move)
    import numpy as np
    assert isinstance(next_state, (list, np.ndarray)), "Next state should be a list or ndarray"
    assert isinstance(reward, (int, float)), "Reward should be numeric"
    assert isinstance(done, bool), "Done should be boolean"
    assert isinstance(truncated, bool), "Truncated should be boolean"
    assert isinstance(info, dict), "Info should be a dict"

def test_agent_no_valid_moves():
    env = MinesweeperEnv()
    agent = MinesweeperRLAgent()
    env.reset()
    env.revealed[:, :] = True
    valid_actions = env.get_valid_actions()
    assert valid_actions == [], "No valid actions should be available"
