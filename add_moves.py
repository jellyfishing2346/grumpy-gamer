games = {
    'frontend/src/components/games/RockPaperScissorsGame.tsx': (
        '    setPlayerMoveHistory(prev => [...prev, choice]);',
        '    setPlayerMoveHistory(prev => [...prev, choice]);\n    addMove({ choice, round: gameState.roundHistory.length + 1 });'
    ),
    'frontend/src/components/games/TicTacToeGame.tsx': (
        '      gameState.currentPlayer !== gameState.userSymbol\n    ) {\n      return;\n    }',
        '      gameState.currentPlayer !== gameState.userSymbol\n    ) {\n      return;\n    }\n    addMove({ index, symbol: gameState.userSymbol, move: gameState.moveHistory.length + 1 });'
    ),
    'frontend/src/components/games/ConnectFourGame.tsx': (
        '    setMoveCount(prev => prev + 1);',
        '    setMoveCount(prev => prev + 1);\n    addMove({ column: col, row: result.row, move: moveCount + 1 });'
    ),
    'frontend/src/components/games/ChessGame.tsx': (
        '    setMoveHistory(prev => [...prev,',
        '    addMove({ from: selectedSquare, to: { row, col }, move: moveHistory.length + 1 });\n    setMoveHistory(prev => [...prev,'
    ),
    'frontend/src/components/games/CheckersGame.tsx': (
        '    setMoveHistory(prev => [...prev,',
        '    addMove({ from: selectedPiece, to: { row, col }, move: moveHistory.length + 1 });\n    setMoveHistory(prev => [...prev,'
    ),
    'frontend/src/components/games/MemoryGame.tsx': (
        '    if (gameState.flippedCards.length >= 2) return;',
        '    if (gameState.flippedCards.length >= 2) return;\n    addMove({ cardId, move: moveCountRef.current + 1 });'
    ),
    'frontend/src/components/games/OthelloGame.tsx': (
        '    const newBoard = makeMove(gameState.board, row, col, playerColor);\n    if (!newBoard) return;',
        '    addMove({ row, col, color: playerColor, move: moveCountRef.current + 1 });\n    const newBoard = makeMove(gameState.board, row, col, playerColor);\n    if (!newBoard) return;'
    ),
    'frontend/src/components/games/SudokuGame.tsx': (
        '    setGameState(prev => ({ ...prev, selectedCell: { row, col } }));',
        '    addMove({ row, col, action: "select", move: moveCountRef.current + 1 });\n    setGameState(prev => ({ ...prev, selectedCell: { row, col } }));'
    ),
}

for filepath, (old, new) in games.items():
    with open(filepath) as f:
        c = f.read()
    if old in c:
        c = c.replace(old, new, 1)
        open(filepath, 'w').write(c)
        print('OK', filepath.split('/')[-1])
    else:
        print('WARN not found:', filepath.split('/')[-1])

# Hangman
filepath = 'frontend/src/components/games/HangmanGame.tsx'
with open(filepath) as f:
    c = f.read()
c = c.replace(
    "      if (gameMode === 'classic') {\n        makeClassicGuess(letter);",
    "      if (gameMode === 'classic') {\n        addMove({ letter, mode: 'classic' });\n        makeClassicGuess(letter);"
)
c = c.replace(
    "      } else if (vsAIState.currentTurn === 'player') {\n        makePlayerGuess(letter);",
    "      } else if (vsAIState.currentTurn === 'player') {\n        addMove({ letter, mode: 'vs-ai' });\n        makePlayerGuess(letter);"
)
open(filepath, 'w').write(c)
print('OK HangmanGame.tsx')

# Minesweeper
filepath = 'frontend/src/components/games/MinesweeperGame.tsx'
with open(filepath) as f:
    c = f.read()
old = "    if (board[row][col].state !== 'hidden') return;\n    \n    let currentBoard = board;"
new = "    if (board[row][col].state !== 'hidden') return;\n    if (isAI === false) addMove({ row, col, action: 'reveal', move: moveCountRef.current + 1 });\n    \n    let currentBoard = board;"
if old in c:
    c = c.replace(old, new, 1)
    open(filepath, 'w').write(c)
    print('OK MinesweeperGame.tsx')
else:
    print('WARN not found: MinesweeperGame.tsx')

# 2048
filepath = 'frontend/src/components/games/Game2048.tsx'
with open(filepath) as f:
    c = f.read()
old = "      if (gameMode === 'classic') {\n        makeClassicMove(direction);"
new = "      addMove({ direction, move: moveCountRef.current + 1 });\n      if (gameMode === 'classic') {\n        makeClassicMove(direction);"
if old in c:
    c = c.replace(old, new, 1)
    open(filepath, 'w').write(c)
    print('OK Game2048.tsx')
else:
    print('WARN not found: Game2048.tsx')

print('\nAll done!')
