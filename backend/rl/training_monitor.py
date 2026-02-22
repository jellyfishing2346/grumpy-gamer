"""
Training Monitoring and Logging for Grumpy Gamer RL Agents

Addresses issue #45: Implement training monitoring and logging.

Features:
- TensorBoard logging for real-time reward tracking
- CSV Logger for mean reward and episode length metrics
- 100,000 timestep baseline training run
- Reward convergence analysis and bottleneck detection

Usage:
    python rl/training_monitor.py --game tictactoe
    python rl/training_monitor.py --game all
    python rl/training_monitor.py --analyze --log-dir rl/logs/tictactoe_monitor_YYYYMMDD
"""

import os
import sys
import csv
import argparse
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
from stable_baselines3 import PPO
from stable_baselines3.common.callbacks import (
    BaseCallback,
    EvalCallback,
    CallbackList,
)
from stable_baselines3.common.monitor import Monitor
from stable_baselines3.common.vec_env import DummyVecEnv
from stable_baselines3.common.logger import configure


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
    config = SUPPORTED_GAMES[game_name]
    module = __import__(config["module"], fromlist=[config["env_class"]])
    env_class = getattr(module, config["env_class"])
    kwargs = config["kwargs"]

    def _init():
        return Monitor(env_class(**kwargs))

    return _init


class MetricsLoggerCallback(BaseCallback):
    """
    Custom callback to log mean reward and episode length to CSV.
    Exports metrics every `log_freq` timesteps for convergence analysis.
    """

    def __init__(self, log_path, log_freq=1000, verbose=0):
        super().__init__(verbose)
        self.log_path = log_path
        self.log_freq = log_freq
        self.csv_path = os.path.join(log_path, "metrics.csv")
        self._file = None
        self._writer = None
        self._episode_rewards = []
        self._episode_lengths = []

    def _on_training_start(self):
        os.makedirs(self.log_path, exist_ok=True)
        self._file = open(self.csv_path, "w", newline="")
        self._writer = csv.writer(self._file)
        self._writer.writerow([
            "timestep", "mean_reward", "std_reward",
            "mean_ep_length", "n_episodes"
        ])
        self._file.flush()

    def _on_step(self):
        # Collect episode info from Monitor wrapper
        infos = self.locals.get("infos", [])
        for info in infos:
            if "episode" in info:
                self._episode_rewards.append(info["episode"]["r"])
                self._episode_lengths.append(info["episode"]["l"])

        # Log every log_freq timesteps
        if self.num_timesteps % self.log_freq == 0 and self._episode_rewards:
            mean_r = float(np.mean(self._episode_rewards[-100:]))
            std_r = float(np.std(self._episode_rewards[-100:]))
            mean_l = float(np.mean(self._episode_lengths[-100:]))
            n_eps = len(self._episode_rewards)

            self._writer.writerow([
                self.num_timesteps, mean_r, std_r, mean_l, n_eps
            ])
            self._file.flush()

            if self.verbose > 0:
                print(
                    f"  [t={self.num_timesteps:>8,}] "
                    f"mean_reward={mean_r:.3f} ± {std_r:.3f}  "
                    f"mean_ep_len={mean_l:.1f}  "
                    f"episodes={n_eps}"
                )

        return True

    def _on_training_end(self):
        if self._file:
            self._file.close()
        print(f"\nMetrics saved to: {self.csv_path}")


def train_with_monitoring(
    game_name,
    total_timesteps=100000,
    n_envs=4,
    log_freq=1000,
):
    """
    Run a monitored training session with TensorBoard + CSV logging.

    Args:
        game_name: Game to train on
        total_timesteps: Training timesteps (default 100k per issue #45)
        n_envs: Parallel environments
        log_freq: How often to log metrics (timesteps)
    """
    if game_name not in SUPPORTED_GAMES:
        raise ValueError(f"Unknown game: {game_name}")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    base_dir = os.path.dirname(os.path.abspath(__file__))
    log_dir = os.path.join(base_dir, "logs", f"{game_name}_monitor_{timestamp}")
    save_dir = os.path.join(base_dir, "models", f"{game_name}_monitor_{timestamp}")

    os.makedirs(log_dir, exist_ok=True)
    os.makedirs(save_dir, exist_ok=True)

    print(f"\n{'='*60}")
    print(f"Training with Monitoring: {game_name.upper()}")
    print(f"{'='*60}")
    print(f"Timesteps:    {total_timesteps:,}")
    print(f"Envs:         {n_envs}")
    print(f"Log freq:     {log_freq:,}")
    print(f"TensorBoard:  tensorboard --logdir {log_dir}")
    print(f"CSV metrics:  {log_dir}/metrics.csv")
    print(f"{'='*60}\n")

    train_env = DummyVecEnv([make_env(game_name) for _ in range(n_envs)])
    eval_env = DummyVecEnv([make_env(game_name)])

    model = PPO(
        "MlpPolicy",
        train_env,
        learning_rate=3e-4,
        n_steps=512,
        batch_size=64,
        n_epochs=10,
        gamma=0.99,
        gae_lambda=0.95,
        clip_range=0.2,
        ent_coef=0.01,
        policy_kwargs={"net_arch": {"pi": [128, 128], "vf": [128, 128]}},
        verbose=0,
    )

    # Configure TensorBoard + stdout logging
    model.set_logger(configure(log_dir, ["stdout", "csv", "tensorboard"]))

    callbacks = CallbackList([
        MetricsLoggerCallback(log_dir, log_freq=log_freq, verbose=1),
        EvalCallback(
            eval_env,
            best_model_save_path=save_dir,
            log_path=log_dir,
            eval_freq=max(10000 // n_envs, 1000),
            n_eval_episodes=50,
            deterministic=True,
            render=False,
        ),
    ])

    print("Starting monitored training (100k timesteps)...")
    model.learn(
        total_timesteps=total_timesteps,
        callback=callbacks,
        progress_bar=False,
    )

    final_path = os.path.join(save_dir, "final_model")
    model.save(final_path)

    # Analyze convergence
    csv_path = os.path.join(log_dir, "metrics.csv")
    if os.path.exists(csv_path):
        analyze_convergence(csv_path, game_name, log_dir)

    print(f"\nTo view TensorBoard: tensorboard --logdir {log_dir}")
    return model


def analyze_convergence(csv_path, game_name, output_dir):
    """
    Analyze reward convergence and identify bottleneck states.
    Documents findings to a text report.
    """
    timesteps, rewards, stds = [], [], []

    with open(csv_path, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            timesteps.append(int(row["timestep"]))
            rewards.append(float(row["mean_reward"]))
            stds.append(float(row["std_reward"]))

    if not rewards:
        return

    rewards = np.array(rewards)
    timesteps = np.array(timesteps)

    # Find convergence point (reward stops improving by >1% over 10k steps)
    convergence_point = None
    window = max(1, len(rewards) // 10)
    for i in range(window, len(rewards)):
        recent = rewards[max(0, i-window):i]
        improvement = (rewards[i] - recent.mean()) / (abs(recent.mean()) + 1e-8)
        if abs(improvement) < 0.01:
            convergence_point = timesteps[i]
            break

    # Identify bottleneck: longest plateau in reward curve
    diffs = np.abs(np.diff(rewards))
    plateau_start = int(np.argmin(diffs)) if len(diffs) > 0 else 0
    bottleneck_timestep = int(timesteps[plateau_start])
    bottleneck_reward = float(rewards[plateau_start])

    # Write report
    report_path = os.path.join(output_dir, "convergence_report.txt")
    with open(report_path, "w") as f:
        f.write(f"Convergence Analysis: {game_name}\n")
        f.write("=" * 50 + "\n\n")
        f.write(f"Total timesteps logged: {timesteps[-1]:,}\n")
        f.write(f"Initial mean reward:    {rewards[0]:.3f}\n")
        f.write(f"Final mean reward:      {rewards[-1]:.3f}\n")
        f.write(f"Peak mean reward:       {rewards.max():.3f}\n")
        f.write(f"Reward improvement:     {rewards[-1] - rewards[0]:+.3f}\n\n")

        if convergence_point:
            f.write(f"Convergence detected at: {convergence_point:,} timesteps\n\n")
        else:
            f.write("Convergence: not yet detected (may need more training)\n\n")

        f.write(f"Potential bottleneck state:\n")
        f.write(f"  Timestep: {bottleneck_timestep:,}\n")
        f.write(f"  Reward:   {bottleneck_reward:.3f}\n")
        f.write(f"  Note: Longest reward plateau - agent may be stuck in local optimum\n\n")

        f.write("Recommendations:\n")
        if rewards[-1] < 0:
            f.write("  - Reward still negative: increase training time or entropy coef\n")
        if rewards.max() - rewards[-1] > 0.3:
            f.write("  - Reward collapsed after peak: reduce learning rate\n")
        if convergence_point and convergence_point < timesteps[-1] * 0.5:
            f.write("  - Early convergence: try higher entropy coef for more exploration\n")
        else:
            f.write("  - Training looks stable\n")

    print(f"\nConvergence report saved: {report_path}")

    # Print summary to stdout
    print(f"\n--- Convergence Analysis: {game_name} ---")
    print(f"  Initial reward:  {rewards[0]:.3f}")
    print(f"  Final reward:    {rewards[-1]:.3f}")
    print(f"  Peak reward:     {rewards.max():.3f}")
    if convergence_point:
        print(f"  Converged at:    {convergence_point:,} timesteps")
    print(f"  Bottleneck at:   {bottleneck_timestep:,} timesteps "
          f"(reward={bottleneck_reward:.3f})")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Training Monitoring (Issue #45)")
    parser.add_argument(
        "--game", "-g",
        type=str,
        default="tictactoe",
        choices=list(SUPPORTED_GAMES.keys()) + ["all"],
    )
    parser.add_argument("--timesteps", "-t", type=int, default=100000)
    parser.add_argument("--n-envs", "-n", type=int, default=4)
    parser.add_argument("--log-freq", "-f", type=int, default=1000)
    parser.add_argument(
        "--analyze", "-a",
        action="store_true",
        help="Analyze an existing metrics.csv without training",
    )
    parser.add_argument("--log-dir", type=str, default=None)

    args = parser.parse_args()

    if args.analyze:
        if not args.log_dir:
            print("Error: --log-dir required with --analyze")
            sys.exit(1)
        csv_path = os.path.join(args.log_dir, "metrics.csv")
        game = args.game if args.game != "all" else "tictactoe"
        analyze_convergence(csv_path, game, args.log_dir)
    elif args.game == "all":
        for game in SUPPORTED_GAMES:
            train_with_monitoring(game, args.timesteps, args.n_envs, args.log_freq)
    else:
        train_with_monitoring(args.game, args.timesteps, args.n_envs, args.log_freq)
