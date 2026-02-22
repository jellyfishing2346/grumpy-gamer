"""
DQN Baseline for Grumpy Gamer RL Agents

Establishes a Deep Q-Network baseline for discrete action-based gameplay.
Addresses issue #43: Setup DQN baseline with SB3.

Features:
- ReplayBuffer size: 50,000
- Epsilon-greedy exploration with configurable fraction and final eps
- Custom MLP policy architecture via net_arch
- Periodic model checkpoints (.zip files)

Usage:
    python rl/dqn_baseline.py --game tictactoe --timesteps 100000
    python rl/dqn_baseline.py --game all --timesteps 100000
"""

import os
import sys
import argparse
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
from stable_baselines3 import DQN
from stable_baselines3.common.callbacks import EvalCallback, CheckpointCallback
from stable_baselines3.common.monitor import Monitor
from stable_baselines3.common.vec_env import DummyVecEnv


# DQN Baseline hyperparameters (issue #43 requirements)
DQN_CONFIG = {
    "buffer_size": 50000,
    "exploration_fraction": 0.2,
    "exploration_final_eps": 0.05,
    "learning_rate": 1e-4,
    "batch_size": 32,
    "learning_starts": 1000,
    "gamma": 0.99,
    "train_freq": 4,
    "target_update_interval": 1000,
    "tau": 1.0,
    "policy_kwargs": {
        "net_arch": [128, 128],
    },
    "verbose": 1,
}

SUPPORTED_GAMES = {
    "tictactoe": {
        "env_class": "TicTacToeEnv",
        "module": "rl.environments.tictactoe_env",
        "kwargs": {"opponent": "random"},
    },
    "connectfour": {
        "env_class": "ConnectFourEnv",
        "module": "rl.environments.connectfour_env",
        "kwargs": {"opponent": "random"},
    },
    "minesweeper": {
        "env_class": "MinesweeperEnv",
        "module": "rl.environments.minesweeper_env",
        "kwargs": {},
    },
    "2048": {
        "env_class": "Game2048Env",
        "module": "rl.environments.game2048_env",
        "kwargs": {},
    },
    "othello": {
        "env_class": "OthelloEnv",
        "module": "rl.environments.othello_env",
        "kwargs": {"opponent": "random"},
    },
    "checkers": {
        "env_class": "CheckersEnv",
        "module": "rl.environments.checkers_env",
        "kwargs": {},
    },
}


def make_env(game_name):
    """Create a monitored environment for the given game."""
    config = SUPPORTED_GAMES[game_name]
    module = __import__(config["module"], fromlist=[config["env_class"]])
    env_class = getattr(module, config["env_class"])
    kwargs = config["kwargs"]

    def _init():
        return Monitor(env_class(**kwargs))

    return _init


def train_dqn(game_name, total_timesteps=100000, checkpoint_freq=10000):
    """Train a DQN agent for the specified game."""
    if game_name not in SUPPORTED_GAMES:
        raise ValueError(f"Unknown game: {game_name}. Choose from {list(SUPPORTED_GAMES.keys())}")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    base_dir = os.path.dirname(os.path.abspath(__file__))
    save_dir = os.path.join(base_dir, "models", f"{game_name}_dqn_{timestamp}")
    log_dir = os.path.join(base_dir, "logs", f"{game_name}_dqn_{timestamp}")

    os.makedirs(save_dir, exist_ok=True)
    os.makedirs(log_dir, exist_ok=True)

    print(f"\n{'='*60}")
    print(f"DQN Baseline Training: {game_name.upper()}")
    print(f"{'='*60}")
    print(f"Timesteps:         {total_timesteps:,}")
    print(f"Buffer size:       {DQN_CONFIG['buffer_size']:,}")
    print(f"Exploration frac:  {DQN_CONFIG['exploration_fraction']}")
    print(f"Final epsilon:     {DQN_CONFIG['exploration_final_eps']}")
    print(f"MLP architecture:  {DQN_CONFIG['policy_kwargs']['net_arch']}")
    print(f"Checkpoint freq:   {checkpoint_freq:,}")
    print(f"Save dir:          {save_dir}")
    print(f"{'='*60}\n")

    train_env = DummyVecEnv([make_env(game_name)])
    eval_env = DummyVecEnv([make_env(game_name)])

    eval_callback = EvalCallback(
        eval_env,
        best_model_save_path=save_dir,
        log_path=log_dir,
        eval_freq=max(checkpoint_freq // 2, 1000),
        n_eval_episodes=50,
        deterministic=True,
        render=False,
    )

    checkpoint_callback = CheckpointCallback(
        save_freq=checkpoint_freq,
        save_path=save_dir,
        name_prefix=f"{game_name}_dqn_checkpoint",
    )

    model = DQN("MlpPolicy", train_env, **DQN_CONFIG)

    print("Starting DQN training...")
    model.learn(
        total_timesteps=total_timesteps,
        callback=[eval_callback, checkpoint_callback],
        progress_bar=False,
    )

    final_path = os.path.join(save_dir, "final_model")
    model.save(final_path)
    print(f"\nFinal model saved: {final_path}.zip")

    results = evaluate_dqn(model, game_name)

    summary_path = os.path.join(save_dir, "training_summary.txt")
    with open(summary_path, "w") as f:
        f.write(f"Game: {game_name}\n")
        f.write(f"Timesteps: {total_timesteps}\n")
        f.write(f"Config: {DQN_CONFIG}\n")
        f.write(f"Results: {results}\n")

    return model, results


def evaluate_dqn(model, game_name, n_episodes=100):
    """Evaluate a trained DQN model."""
    config = SUPPORTED_GAMES[game_name]
    module = __import__(config["module"], fromlist=[config["env_class"]])
    env_class = getattr(module, config["env_class"])
    env = env_class(**config["kwargs"])

    total_rewards = []

    for _ in range(n_episodes):
        obs, _ = env.reset()
        done = False
        episode_reward = 0

        while not done:
            action, _ = model.predict(obs, deterministic=True)
            obs, reward, terminated, truncated, _ = env.step(int(action))
            episode_reward += reward
            done = terminated or truncated

        total_rewards.append(episode_reward)

    results = {
        "mean_reward": float(np.mean(total_rewards)),
        "std_reward": float(np.std(total_rewards)),
        "min_reward": float(np.min(total_rewards)),
        "max_reward": float(np.max(total_rewards)),
        "n_episodes": n_episodes,
    }

    print(f"\nEvaluation over {n_episodes} episodes:")
    print(f"  Mean reward: {results['mean_reward']:.3f} +/- {results['std_reward']:.3f}")
    print(f"  Min: {results['min_reward']:.3f}  Max: {results['max_reward']:.3f}")

    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="DQN Baseline Training (Issue #43)")
    parser.add_argument(
        "--game", "-g",
        type=str,
        default="tictactoe",
        choices=list(SUPPORTED_GAMES.keys()) + ["all"],
        help="Game to train on (or 'all' for all games)",
    )
    parser.add_argument(
        "--timesteps", "-t",
        type=int,
        default=100000,
        help="Total training timesteps",
    )
    parser.add_argument(
        "--checkpoint-freq", "-c",
        type=int,
        default=10000,
        help="Checkpoint save frequency (timesteps)",
    )
    parser.add_argument(
        "--evaluate", "-e",
        type=str,
        default=None,
        help="Path to model zip to evaluate (skips training)",
    )

    args = parser.parse_args()

    if args.evaluate:
        game = args.game if args.game != "all" else "tictactoe"
        model = DQN.load(args.evaluate)
        evaluate_dqn(model, game)
    elif args.game == "all":
        all_results = {}
        for game in SUPPORTED_GAMES:
            _, results = train_dqn(game, args.timesteps, args.checkpoint_freq)
            all_results[game] = results
        print("\n" + "="*60)
        print("ALL GAMES SUMMARY")
        print("="*60)
        for game, results in all_results.items():
            print(f"{game:15s}: mean_reward={results['mean_reward']:.3f}")
    else:
        train_dqn(args.game, args.timesteps, args.checkpoint_freq)
