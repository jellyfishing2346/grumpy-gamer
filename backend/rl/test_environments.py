"""
Test all Gymnasium environments for SB3 compatibility using check_env.
Addresses issue #42: Gymnasium wrappers for game state observation.
"""
import sys
import traceback
from stable_baselines3.common.env_checker import check_env

def test_env(env_class, env_name, **kwargs):
    print(f"\nTesting {env_name}...")
    try:
        env = env_class(**kwargs)
        check_env(env, warn=True)
        obs, info = env.reset()
        print(f"  observation_space: {env.observation_space}")
        print(f"  action_space:      {env.action_space}")
        print(f"  reset() obs shape: {obs.shape}")
        action = env.action_space.sample()
        obs, reward, terminated, truncated, info = env.step(action)
        print(f"  step() reward: {reward}, terminated: {terminated}")
        env.close()
        print(f"  ✅ {env_name} PASSED")
        return True
    except Exception as e:
        print(f"  ❌ {env_name} FAILED: {e}")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    sys.path.insert(0, ".")
    from rl.environments import (
        TicTacToeEnv, ConnectFourEnv, CheckersEnv,
        MinesweeperEnv, Game2048Env, OthelloEnv
    )

    results = []
    results.append(test_env(TicTacToeEnv,    "TicTacToe",   opponent="random"))
    results.append(test_env(ConnectFourEnv,  "ConnectFour", opponent="random"))
    results.append(test_env(CheckersEnv,     "Checkers"))
    results.append(test_env(MinesweeperEnv,  "Minesweeper"))
    results.append(test_env(Game2048Env,     "Game2048"))
    results.append(test_env(OthelloEnv,      "Othello",     opponent="random"))

    print(f"\n{'='*40}")
    passed = sum(results)
    total = len(results)
    print(f"Results: {passed}/{total} environments passed")
    sys.exit(0 if passed == total else 1)
