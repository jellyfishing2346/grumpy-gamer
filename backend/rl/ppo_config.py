"""
PPO Actor-Critic Policy Configuration

Optimizes Proximal Policy Optimization for stable model convergence.
Addresses issue #44: Config PPO actor-critic policy.

Features:
- Actor-Critic MLP architecture via policy_kwargs
- Tuned learning_rate (3e-4) and clip_range (0.2)
- Per-game configs optimized for each environment

Usage:
    python rl/ppo_config.py --game tictactoe --timesteps 100000
    python rl/ppo_config.py --game all --timesteps 100000
"""

import os
import sys
import argparse
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
from stable_baselines3 import PPO
from stable_baselines3.common.callbacks import EvalCallback, CheckpointCallback
from stable_baselines3.common.monitor import Monitor
from stable_baselines3.common.vec_env import DummyVecEnv


# Base PPO Actor-Critic config for stable convergence
BASE_PPO_CONFIG = {
    "learning_rate": 3e-4,      # Starting learning rate (issue #44)
    "clip_range": 0.2,          # PPO clip range (issue #44)
    "n_steps": 2048,            # Steps per rollout per env
    "batch_size": 64,           # Minibatch size
    "n_epochs": 10,             # Epochs per update
    "gamma": 0.99,              # Discount factor
    "gae_lambda": 0.95,         # GAE lambda
    "ent_coef": 0.01,           # Entropy coefficient
    "vf_coef": 0.5,             # Value function coefficient
    "max_grad_norm": 0.5,       # Gradient clipping
    "policy_kwargs": {
        "net_arch": {
            "pi": [128, 128],   # Actor network
            "vf": [128, 128],   # Critic network
        }
    },
    "verbose": 1,
}

# Per-game overrides tuned for each environment
GAME_PPO_CONFIGS = {
    "tictactoe": {
        **BASE_PPO_CONFIG,
        "n_steps": 512,
        "batch_size": 64,
        "ent_coef": 0.01,
    },
    "connectfour": {
        **BASE_PPO_CONFIG,
        "n_steps": 1024,
        "batch_size": 64,
        "ent_coef": 0.005,
    },
    "minesweeper": {
        **BASE_PPO_CONFIG,
        "n_steps": 2048,
        "batch_size": 128,
        "ent_coef": 0.02,
        "learning_rate": 1e-4,
    },
    "2048": {
        **BASE_PPO_CONFIG,
        "n_steps": 2048,
        "batch_size": 128,
        "ent_coef": 0.02,
        "gamma": 0.999,
    },
    "othello": {
        **BASE_PPO_CONFIG,
        "n_steps": 1024,
        "batch_size": 64,
        "ent_coef": 0.005,
    },
    "checkers": {
        **BASE_PPO_CONFIG,
        "n_steps": 2048,
        "batch_size": 64,
        "ent_coef": 0.005,
        "learning_rate": 1e-4,
    },
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


def train_ppo(game_name, total_timesteps=100000, n_envs=4, checkpoint_freq=10000):
    """
    Train a PPO actor-critic agent for the specified game.

    Args:
        game_name: Name of the game to train on
        total_timesteps: Total training timesteps
        n_envs: Number of parallel environments
        checkpoint_freq: How often to save checkpoints
    """
    if game_name not in SUPPORTED_GAMES:
        raise ValueError(f"Unknown game: {game_name}.")

    ppo_config = GAME_PPO_CONFIGS[game_name]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    base_dir = os.path.dirname(os.path.abspath(__file__))
    save_dir = os.path.join(base_dir, "models", f"{game_name}_ppo_{timestamp}")
    log_dir = os.path.join(base_dir, "logs", f"{game_name}_ppo_{timestamp}")

    os.makedirs(save_dir, exist_ok=True)
    os.makedirs(log_dir, exist_ok=True)

    print(f"\n{'='*60}")
    print(f"PPO Actor-Critic Training: {game_name.upper()}")
    print(f"{'='*60}")
    print(f"Timesteps:        {total_timesteps:,}")
    print(f"Parallel envs:    {n_envs}")
    print(f"Learning rate:    {ppo_config['learning_rate']}")
    print(f"Clip range:       {ppo_config['clip_range']}")
    print(f"Actor arch:       {ppo_config['policy_kwargs']['net_arch']['pi']}")
    print(f"Critic arch:      {ppo_config['policy_kwargs']['net_arch']['vf']}")
    print(f"Entropy coef:     {ppo_config['ent_coef']}")
    print(f"Save dir:         {save_dir}")
    print(f"{'='*60}\n")

    train_env = DummyVecEnv([make_env(game_name) for _ in range(n_envs)])
    eval_env = DummyVecEnv([make_env(game_name)])

    eval_callback = EvalCallback(
        eval_env,
        best_model_save_path=save_dir,
        log_path=log_dir,
        eval_freq=max(checkpoint_freq // n_envs, 1000),
        n_eval_episodes=50,
        deterministic=True,
        render=False,
    )

    checkpoint_callback = CheckpointCallback(
        save_freq=max(checkpoint_freq // n_envs, 1000),
        save_path=save_dir,
        name_prefix=f"{game_name}_ppo_checkpoint",
    )

    model = PPO("MlpPolicy", train_env, **ppo_config)

    print("Starting PPO training...")
    model.learn(
        total_timesteps=total_timesteps,
        callback=[eval_callback, checkpoint_callback],
        progress_bar=False,
    )

    final_path = os.path.join(save_dir, "final_model")
    model.save(final_path)
    print(f"\nFinal model saved: {final_path}.zip")

    results = evaluate_ppo(model, game_name)

    summary_path = os.path.join(save_dir, "training_summary.txt")
    with open(summary_path, "w") as f:
        f.write(f"Game: {game_name}\n")
        f.write(f"Timesteps: {total_timesteps}\n")
        f.write(f"Config: {ppo_config}\n")
        f.write(f"Results: {results}\n")

    return model, results


def evaluate_ppo(model, game_name, n_episodes=100):
    """Evaluate a trained PPO model."""
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
    parser = argparse.ArgumentParser(description="PPO Actor-Critic Training (Issue #44)")
    parser.add_argument(
        "--game", "-g",
        type=str,
        default="tictactoe",
        choices=list(SUPPORTED_GAMES.keys()) + ["all"],
    )
    parser.add_argument("--timesteps", "-t", type=int, default=100000)
    parser.add_argument("--n-envs", "-n", type=int, default=4)
    parser.add_argument("--checkpoint-freq", "-c", type=int, default=10000)
    parser.add_argument("--evaluate", "-e", type=str, default=None)

    args = parser.parse_args()

    if args.evaluate:
        game = args.game if args.game != "all" else "tictactoe"
        model = PPO.load(args.evaluate)
        evaluate_ppo(model, game)
    elif args.game == "all":
        all_results = {}
        for game in SUPPORTED_GAMES:
            _, results = train_ppo(game, args.timesteps, args.n_envs, args.checkpoint_freq)
            all_results[game] = results
        print("\n" + "="*60)
        print("ALL GAMES SUMMARY")
        print("="*60)
        for game, results in all_results.items():
            print(f"{game:15s}: mean_reward={results['mean_reward']:.3f}")
    else:
        train_ppo(args.game, args.timesteps, args.n_envs, args.checkpoint_freq)
