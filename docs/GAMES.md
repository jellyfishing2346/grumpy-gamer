# 🎮 Grumpy Gamer - Games Documentation

<div align="center">

![Games](https://img.shields.io/badge/Games-12-blue?style=for-the-badge)
![AI Opponents](https://img.shields.io/badge/AI%20Opponents-Included-green?style=for-the-badge)
![Difficulty Levels](https://img.shields.io/badge/Difficulty-Easy%20%7C%20Medium%20%7C%20Hard-orange?style=for-the-badge)

*Challenge yourself against our grumpy AI across 12 exciting games!*

</div>

---

## 📑 Table of Contents

| # | Game | Description | Route |
|:-:|:-----|:------------|:------|
| 1 | [🎯 Wordle](#1-wordle-) | Guess the 5-letter word | `/play/wordle` |
| 2 | [🧩 Sudoku](#2-sudoku-) | Classic number puzzle | `/play/sudoku` |
| 3 | [⭕ Tic-Tac-Toe](#3-tic-tac-toe-) | Get three in a row | `/play/tictactoe` |
| 4 | [🔴 Connect Four](#4-connect-four-) | Connect four discs | `/play/connectfour` |
| 5 | [♟️ Chess](#5-chess-) | Classic strategy game | `/play/chess` |
| 6 | [⛀ Checkers](#6-checkers-) | Jump and capture | `/play/checkers` |
| 7 | [✊ Rock Paper Scissors](#7-rock-paper-scissors-) | Classic hand game | `/play/rps` |
| 8 | [💣 Minesweeper](#8-minesweeper-) | Avoid the mines | `/play/minesweeper` |
| 9 | [🔤 Hangman](#9-hangman-) | Guess the word | `/play/hangman` |
| 10 | [⚫️⚪️ Othello](#10-othelloreversie-) | Flip discs to win | `/play/othello` |
| 11 | [🃏 Memory](#11-memory-) | Match pairs | `/play/memory` |
| 12 | [2️⃣0️⃣4️⃣8️⃣ 2048](#12-2048-) | Slide and merge tiles | `/play/2048` |

---

## 1. Wordle 🎯

<table>
<tr>
<td width="60%">

### 📖 Overview
Wordle is a word-guessing game where players have 6 attempts to guess a hidden 5-letter word.

### 🎮 How to Play
1. Enter a 5-letter word guess
2. Submit your guess
3. Receive color-coded feedback
4. Use the feedback to make better guesses
5. Win by guessing the word within 6 tries

### 🎨 Color Feedback
| Color | Meaning |
|:-----:|:--------|
| 🟩 | Correct letter, correct position |
| 🟨 | Correct letter, wrong position |
| ⬜ | Letter not in word |

</td>
<td width="40%">

### 🤖 AI Strategy
> The AI uses **letter frequency analysis** and **pattern matching** to make intelligent guesses.

**Difficulty Levels:**
- 🟢 **Easy**: Random letter selection
- 🟡 **Medium**: Basic frequency analysis
- 🔴 **Hard**: Optimal word elimination

**VS AI Mode:** Both players guess the same word. Fewer attempts = winner!

</td>
</tr>
</table>

📁 **File:** `frontend/src/components/games/WordleGame.tsx`

---

## 2. Sudoku 🧩

<table>
<tr>
<td width="60%">

### 📖 Overview
Sudoku is a logic-based number placement puzzle. Fill a 9×9 grid so each column, row, and 3×3 sub-grid contains digits 1-9.

### 🎮 How to Play
1. Click an empty cell to select it
2. Enter a number (1-9)
3. Number must be unique in its row, column, and 3×3 box
4. Complete the entire grid to win

### 📊 Grid Rules
```
┌───────┬───────┬───────┐
│ 1 2 3 │ 4 5 6 │ 7 8 9 │  ← Each row: 1-9
│ 4 5 6 │ 7 8 9 │ 1 2 3 │
│ 7 8 9 │ 1 2 3 │ 4 5 6 │
├───────┼───────┼───────┤
│   ↑   │       │       │
│ Each  │ Each  │       │
│ col   │ box   │       │
└───────┴───────┴───────┘
```

</td>
<td width="40%">

### 🤖 AI Strategy
> Uses **backtracking** with **constraint propagation**

**Techniques:**
- ✅ Naked singles detection
- ✅ Hidden singles detection
- ✅ Backtracking for complex cases

**Difficulty Levels:**
| Level | Empty Cells |
|:------|:------------|
| 🟢 Easy | ~35 cells |
| 🟡 Medium | ~45 cells |
| 🔴 Hard | ~55 cells |

</td>
</tr>
</table>

📁 **File:** `frontend/src/components/games/SudokuGame.tsx`

---

## 3. Tic-Tac-Toe ⭕

<table>
<tr>
<td width="60%">

### 📖 Overview
Classic two-player game. Get three marks in a row to win!

### 🎮 How to Play
1. You play as ❌, AI plays as ⭕
2. Click an empty cell to place your mark
3. Get three in a row (horizontal, vertical, or diagonal)
4. Block the AI from winning!

### 🏆 Winning Combinations
```
 ✓ | ✓ | ✓     ✓ |   |       ✓ |   |   
───┼───┼───   ───┼───┼───   ───┼───┼───
   |   |       ✓ |   |         | ✓ |   
───┼───┼───   ───┼───┼───   ───┼───┼───
   |   |       ✓ |   |         |   | ✓ 
 Horizontal    Vertical     Diagonal
```

</td>
<td width="40%">

### 🤖 AI Strategy
> Uses the **Minimax Algorithm**

⚠️ **Warning:** On Hard difficulty, the AI is **UNBEATABLE**. Best you can do is a draw!

**Difficulty Levels:**
- 🟢 **Easy**: Random moves
- 🟡 **Medium**: Limited lookahead
- 🔴 **Hard**: Perfect play (Minimax)

**Stats:**
- 8 winning combinations
- 255,168 possible games
- 3 possible outcomes

</td>
</tr>
</table>

📁 **File:** `frontend/src/components/games/TicTacToeGame.tsx`

---

## 4. Connect Four 🔴

<table>
<tr>
<td width="60%">

### 📖 Overview
Drop colored discs into a 7×6 grid. First to connect four in a row wins!

### 🎮 How to Play
1. Click a column to drop your disc (🔴)
2. Discs fall to the lowest available position
3. AI drops yellow discs (🟡)
4. Connect four horizontally, vertically, or diagonally

### 🎯 Board Layout
```
┌───┬───┬───┬───┬───┬───┬───┐
│   │   │   │   │   │   │   │
├───┼───┼───┼───┼───┼───┼───┤
│   │   │ 🔴│   │   │   │   │
├───┼───┼───┼───┼───┼───┼───┤
│   │   │ 🟡│ 🔴│   │   │   │
├───┼───┼───┼───┼───┼───┼───┤
│   │ 🔴│ 🔴│ 🟡│ 🟡│   │   │
├───┼───┼───┼───┼───┼───┼───┤
│ 🟡│ 🟡│ 🔴│ 🔴│ 🟡│ 🔴│   │
└───┴───┴───┴───┴───┴───┴───┘
  1   2   3   4   5   6   7
```

</td>
<td width="40%">

### 🤖 AI Strategy
> Uses **Minimax** with **Alpha-Beta Pruning**

**Key Strategies:**
- 🎯 Control center column
- ⚔️ Create multiple threats
- 🛡️ Block player's wins
- 🔮 Plan several moves ahead

**Difficulty = Lookahead:**
| Level | Moves Ahead |
|:------|:-----------:|
| 🟢 Easy | 2 |
| 🟡 Medium | 4 |
| 🔴 Hard | 6+ |

</td>
</tr>
</table>

📁 **File:** `frontend/src/components/games/ConnectFourGame.tsx`

---

## 5. Chess ♟️

<table>
<tr>
<td width="60%">

### 📖 Overview
The ultimate strategy game. Command 16 pieces and checkmate the opponent's king!

### 🎮 How to Play
1. Click a piece to select it
2. Valid moves are highlighted
3. Click a highlighted square to move
4. Checkmate the opponent's king to win

### ♟️ Piece Movement
| Piece | Movement |
|:-----:|:---------|
| ♔ King | One square any direction |
| ♕ Queen | Any direction, any distance |
| ♖ Rook | Horizontal/Vertical |
| ♗ Bishop | Diagonal |
| ♘ Knight | L-shape (can jump) |
| ♙ Pawn | Forward (captures diagonal) |

</td>
<td width="40%">

### 🤖 AI Strategy
> Uses **Minimax** with **Piece-Square Tables**

**Evaluation Factors:**
- 💎 Material balance
- 📍 Piece positioning
- 👑 King safety
- 🏃 Piece mobility
- 🎯 Center control

**Special Moves:**
- 🏰 Castling
- 📍 En Passant
- 👑 Pawn Promotion

**Piece Values:**
```
♙=1  ♘=3  ♗=3  ♖=5  ♕=9  ♔=∞
```

</td>
</tr>
</table>

📁 **File:** `frontend/src/components/games/ChessGame.tsx`

---

## 6. Checkers ⛀

<table>
<tr>
<td width="60%">

### 📖 Overview
Classic board game. Jump over opponents to capture them and reach the other side to become a King!

### 🎮 How to Play
1. Click your piece to select it
2. Move diagonally forward
3. Jump over enemies to capture
4. Multiple jumps = combo captures!
5. Reach the opposite end = 👑 King

### 📜 Rules
- ⚠️ **Must capture** if available
- 🔄 **Kings** move in any diagonal direction
- 🏆 **Win** by capturing all pieces or blocking all moves

</td>
<td width="40%">

### 🤖 AI Strategy
> Uses **Minimax** with position evaluation

**Priorities:**
1. 👑 Get kings ASAP
2. 🎯 Control the center
3. ⚔️ Set up captures
4. 🛡️ Protect pieces

**Piece Values:**
| Type | Value |
|:-----|:-----:|
| Regular | 1 |
| King | 3 |

**Board Control:**
```
Edge < Center < King Row
```

</td>
</tr>
</table>

📁 **File:** `frontend/src/components/games/CheckersGame.tsx`

---

## 7. Rock Paper Scissors ✊

<table>
<tr>
<td width="60%">

### 📖 Overview
The classic hand game of chance and psychology!

### 🎮 How to Play
1. Choose: ✊ 📄 ✂️
2. AI makes its choice simultaneously
3. Winner determined by rules below

### 🔄 Game Rules
```
    ✊ Rock
   ╱    ╲
  ╱      ╲ crushes
 ╱        ╲
✂️ ←───── 📄
Scissors   Paper
  cuts    covers
```

| You | vs | AI | Result |
|:---:|:--:|:--:|:------:|
| ✊ | → | ✂️ | ✅ Win |
| 📄 | → | ✊ | ✅ Win |
| ✂️ | → | 📄 | ✅ Win |

</td>
<td width="40%">

### 🤖 AI Strategy
> Uses **Pattern Recognition**

**How AI Thinks:**
- 📊 Tracks your move history
- 🔍 Identifies patterns
- 🎯 Predicts your next move
- ⚔️ Plays the counter

**Difficulty Levels:**
- 🟢 **Easy**: Random (33% win rate)
- 🟡 **Medium**: Basic patterns
- 🔴 **Hard**: Advanced analysis

**Game Modes:**
- Single Round
- Best of 3
- Best of 5

</td>
</tr>
</table>

📁 **File:** `frontend/src/components/games/RockPaperScissorsGame.tsx`

---

## 8. Minesweeper 💣

<table>
<tr>
<td width="60%">

### 📖 Overview
Logic puzzle game. Uncover cells while avoiding hidden mines!

### 🎮 How to Play
1. Click a cell to reveal it
2. Numbers show adjacent mine count
3. Right-click to flag suspected mines
4. Reveal all safe cells to win
5. 💥 Click a mine = Game Over!

### 🔢 Number Meanings
```
┌───┬───┬───┐
│ 💣│ 1 │   │  The "1" means
├───┼───┼───┤  there's 1 mine
│ 1 │ 1 │   │  adjacent to it
├───┼───┼───┤  (the 💣)
│   │   │   │
└───┴───┴───┘
```

</td>
<td width="40%">

### 🤖 AI Strategy
> Uses **Probability Analysis**

**Techniques:**
- ✅ Identify guaranteed safe cells
- 📊 Calculate mine probability
- 🧩 Constraint satisfaction
- 🚩 Flag definite mines

**Difficulty Levels:**
| Level | Grid | Mines |
|:------|:----:|:-----:|
| 🟢 Easy | 9×9 | 10 |
| 🟡 Medium | 16×16 | 40 |
| 🔴 Hard | 30×16 | 99 |

**VS AI:** Race to clear the board!

</td>
</tr>
</table>

📁 **File:** `frontend/src/components/games/MinesweeperGame.tsx`

---

## 9. Hangman 🔤

<table>
<tr>
<td width="60%">

### 📖 Overview
Guess the hidden word letter by letter before the hangman is complete!

### 🎮 How to Play
1. Hidden word shown as blanks: `_ _ _ _ _`
2. Click letters to guess
3. Correct = letter revealed
4. Wrong = hangman part added
5. 6 wrong guesses = ☠️ Game Over

### 🎨 Hangman Progression
```
 ┌──┐    ┌──┐    ┌──┐    ┌──┐
 │  😀   │  😟   │  😰   │  ☠️
 │ /|\   │ /|\   │ /|\   │ /|\
 │ / \   │ / \   │ / \   │ / \
═╧═     ═╧═     ═╧═     ═╧═
 3 left  2 left  1 left  GAME OVER
```

</td>
<td width="40%">

### 🤖 AI Strategy
> Uses **Letter Frequency Analysis**

**Common Letters (in order):**
```
E T A O I N S H R
```

**AI Process:**
1. Start with common letters
2. Analyze revealed pattern
3. Narrow down possibilities
4. Make educated guesses

**VS AI Mode:**
Both guess the same word. Fewer wrong guesses = winner!

</td>
</tr>
</table>

📁 **File:** `frontend/src/components/games/HangmanGame.tsx`

---

## 10. Othello/Reversi ⚫️⚪️

<table>
<tr>
<td width="60%">

### 📖 Overview
Strategy game on an 8×8 board. Place discs to flip opponent's pieces!

### 🎮 How to Play
1. You play ⚫, AI plays ⚪
2. Place disc to trap opponent's discs
3. Trapped discs flip to your color
4. Most discs when board is full wins!

### 📜 Flipping Rules
```
Before:  ⚫ ⚪ ⚪ ⚪ [ ]
Place:   ⚫ ⚪ ⚪ ⚪ ⚫  ← Place here
After:   ⚫ ⚫ ⚫ ⚫ ⚫  ← All flip!
```

**Flip directions:** ↑ ↓ ← → ↖ ↗ ↙ ↘

</td>
<td width="40%">

### 🤖 AI Strategy
> Uses **Minimax** with **Position Weights**

**Position Values:**
```
💎  ⚠️  ⭐  ·  ·  ⭐  ⚠️  💎
⚠️  ☠️  ·   ·  ·  ·   ☠️  ⚠️
⭐  ·   ·   ·  ·  ·   ·   ⭐
·   ·   ·   ·  ·  ·   ·   ·
⭐  ·   ·   ·  ·  ·   ·   ⭐
⚠️  ☠️  ·   ·  ·  ·   ☠️  ⚠️
💎  ⚠️  ⭐  ·  ·  ⭐  ⚠️  💎

💎 = Corners (BEST!)
☠️ = X-squares (AVOID!)
```

</td>
</tr>
</table>

📁 **File:** `frontend/src/components/games/OthelloGame.tsx`

---

## 11. Memory 🃏

<table>
<tr>
<td width="60%">

### 📖 Overview
Card matching game. Find all pairs by remembering card positions!

### 🎮 How to Play
1. Click a card to flip it
2. Click another card to find a match
3. Matching pair = stay face-up + 1 point
4. No match = flip back down
5. Match = another turn!
6. Most pairs wins!

### 🃏 Card Grid
```
┌────┬────┬────┬────┐
│ 🐶 │ ?? │ ?? │ 🐱 │
├────┼────┼────┼────┤
│ ?? │ 🐶 │ ?? │ ?? │
├────┼────┼────┼────┤
│ ?? │ ?? │ 🐱 │ ?? │
└────┴────┴────┴────┘
   Find the pairs!
```

</td>
<td width="40%">

### 🤖 AI Strategy
> Uses **Memory Simulation**

**AI Memory by Difficulty:**
| Level | Memory | Grid |
|:------|:------:|:----:|
| 🟢 Easy | 40% | 4×3 |
| 🟡 Medium | 60% | 4×4 |
| 🔴 Hard | 80% | 6×4 |

**How AI "Remembers":**
- Stores seen card positions
- Probability based on difficulty
- Matches known pairs first

**Early Winner:**
Game ends when someone has majority of pairs!

</td>
</tr>
</table>

📁 **File:** `frontend/src/components/games/MemoryGame.tsx`

---

## 12. 2048 2️⃣0️⃣4️⃣8️⃣

<table>
<tr>
<td width="60%">

### 📖 Overview
Sliding puzzle game. Combine tiles to reach 2048!

### 🎮 How to Play
1. Use arrow keys to slide tiles
2. Same numbers merge when colliding
3. New tile (2 or 4) appears after each move
4. Reach 2048 to win!
5. No moves left = Game Over

### 🔢 Merging
```
┌────┬────┬────┬────┐
│  2 │  2 │    │    │  Slide →
├────┼────┼────┼────┤
│    │    │    │    │
└────┴────┴────┴────┘

┌────┬────┬────┬────┐
│    │    │    │  4 │  Result!
├────┼────┼────┼────┤
│    │    │    │  2 │  (new tile)
└────┴────┴────┴────┘
```

</td>
<td width="40%">

### 🤖 AI Strategy
> Uses **Expectimax Algorithm**

**Key Strategies:**
- 📐 Keep highest tile in corner
- 📊 Maintain monotonic rows
- 📭 Maximize empty cells
- 🔗 Chain merge opportunities

**Tile Progression:**
```
2 → 4 → 8 → 16 → 32 → 64
    → 128 → 256 → 512
        → 1024 → 2048 🎉
```

**Scoring:**
Each merge adds tile value to score!

</td>
</tr>
</table>

📁 **File:** `frontend/src/components/games/Game2048.tsx`

---

## 🏗️ Technical Architecture

### 📁 File Structure
```
frontend/src/components/games/
├── 🎯 WordleGame.tsx
├── 🧩 SudokuGame.tsx
├── ⭕ TicTacToeGame.tsx
├── 🔴 ConnectFourGame.tsx
├── ♟️ ChessGame.tsx
├── ⛀ CheckersGame.tsx
├── ✊ RockPaperScissorsGame.tsx
├── 💣 MinesweeperGame.tsx
├── 🔤 HangmanGame.tsx
├── ⚫ OthelloGame.tsx
├── 🃏 MemoryGame.tsx
└── 🔢 Game2048.tsx
```

### 🤖 AI Algorithms Used

| Algorithm | Games |
|:----------|:------|
| **Minimax** | Chess, Checkers, Connect Four, Tic-Tac-Toe, Othello |
| **Alpha-Beta Pruning** | Chess, Connect Four, Othello |
| **Expectimax** | 2048 |
| **Pattern Recognition** | Rock Paper Scissors |
| **Frequency Analysis** | Wordle, Hangman |
| **Constraint Satisfaction** | Sudoku, Minesweeper |
| **Memory Simulation** | Memory |

### ✨ Common Features

| Feature | Description |
|:--------|:------------|
| 🎮 VS AI Mode | Play against intelligent AI |
| 📊 Difficulty Levels | Easy, Medium, Hard |
| 📈 Score Tracking | Track wins, losses, ties |
| 📱 Responsive UI | Works on all devices |
| 🎨 Visual Feedback | Clear game state indicators |
| 🔄 New Game | Restart anytime |

---

<div align="center">

## 🚀 Quick Start

```
/play/wordle      /play/sudoku       /play/tictactoe
/play/connectfour /play/chess        /play/checkers
/play/rps         /play/minesweeper  /play/hangman
/play/othello     /play/memory       /play/2048
```

---

**Made with 💙 by Faizan Khan**

*Last Updated: February 2026*

</div>
