from games.wordle import Wordle
from agents.wordle_agent import WordleAgent

game = Wordle(solution="STONE")
agent = WordleAgent()
agent.solve(game)