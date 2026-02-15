import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from backend.rl.agents.tictactoe_agent import TicTacToeRLAgent
from backend.rl.environments.tictactoe_env import TicTacToeEnv

def test_tictactoe_agent_vs_env():
    env = TicTacToeEnv()
    agent = TicTacToeRLAgent()
    env.reset()
    state = env.board.copy()
    board_2d = [state[i:i+3] for i in range(0, 9, 3)]
    move = agent.get_action(board_2d)
    valid_actions = env.get_valid_actions()
    assert move in valid_actions, "Agent should select a valid action"
    next_state, reward, done, truncated, info = env.step(move)
    import numpy as np
    assert isinstance(next_state, (list, np.ndarray)), "Next state should be a list or ndarray"
    assert isinstance(reward, (int, float)), "Reward should be numeric"
    assert isinstance(done, bool), "Done should be boolean"
    assert isinstance(truncated, bool), "Truncated should be boolean"
    assert isinstance(info, dict), "Info should be a dict"

def test_agent_invalid_move():
    env = TicTacToeEnv()
    agent = TicTacToeRLAgent()
    env.reset()
    state = env.board.copy()
    env.board = [1, -1, 1, -1, 1, -1, 1, -1, 0]
    board_2d = [env.board[i:i+3] for i in range(0, 9, 3)]
    move = agent.get_action(board_2d)
    assert move == 8, "Agent should select the only available move"
    next_state, reward, done, truncated, info = env.step(move)
    assert done or reward is not None
