import React, { useState } from "react";

const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;

const AI_WORD_LIST = [
  "GRUMP", "PLANT", "SHARE", "CLOUD", "BRAVE", "SNAKE", "TRIAL", "MOUSE", "CRISP", "BRAIN"
];

function getRandomWord() {
  return AI_WORD_LIST[Math.floor(Math.random() * AI_WORD_LIST.length)];
}

const getInitialGuesses = () => Array(MAX_ATTEMPTS).fill("");


const WordleGame: React.FC = () => {
  const [answer] = useState(() => getRandomWord());
  const [guesses, setGuesses] = useState<string[]>(getInitialGuesses());
  const [aiGuesses, setAIGuesses] = useState<string[]>(getInitialGuesses());
  const [currentGuess, setCurrentGuess] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [aiAttempt, setAIAttempt] = useState(0);
  const [status, setStatus] = useState<string>("");
  const [aiStatus, setAIStatus] = useState<string>("");

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value.length <= WORD_LENGTH) {
      setCurrentGuess(e.target.value.toUpperCase());
    }
  };


  // AI guessing logic: picks the next word in the list that hasn't been guessed
  const aiMakeGuess = (prevGuesses: string[], aiAttemptNum: number) => {
    // Pick a word not already guessed by AI
    const used = new Set(prevGuesses.filter(Boolean));
    let candidates = AI_WORD_LIST.filter(w => !used.has(w));
    // Prevent AI from guessing the answer on the first round
    if (aiAttemptNum === 0 && candidates.includes(answer)) {
      candidates = candidates.filter(w => w !== answer);
    }
    let guess = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : "PLANT";
    return guess;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentGuess.length !== WORD_LENGTH || status || aiStatus) return;
    // User guess
    const newGuesses = [...guesses];
    newGuesses[attempt] = currentGuess;
    setGuesses(newGuesses);
    let userWin = false;
    let userLose = false;
    if (currentGuess === answer) {
      setStatus("🎉 You guessed it!");
      userWin = true;
    } else if (attempt + 1 === MAX_ATTEMPTS) {
      setStatus(`😢 Out of attempts! The word was ${answer}.`);
      userLose = true;
    }

    // AI guess
    let aiGuess = aiMakeGuess(aiGuesses, aiAttempt);
    const newAIGuesses = [...aiGuesses];
    newAIGuesses[aiAttempt] = aiGuess;
    setAIGuesses(newAIGuesses);
    let aiWin = false;
    let aiLose = false;
    if (aiGuess === answer) {
      setAIStatus("🤖 AI guessed it!");
      aiWin = true;
    } else if (aiAttempt + 1 === MAX_ATTEMPTS) {
      setAIStatus(`🤖 AI failed! The word was ${answer}.`);
      aiLose = true;
    }

    // End game if either wins
    if (userWin && aiWin) {
      setStatus("🎉 You and the AI both guessed it!");
      setAIStatus("🤖 AI also guessed it!");
    } else if (userWin) {
      setAIStatus("🤖 AI lost to you!");
    } else if (aiWin) {
      setStatus("😢 AI won this time!");
    } else if (userLose && aiLose) {
      setStatus(`😢 Both failed! The word was ${answer}.`);
      setAIStatus(`🤖 Both failed! The word was ${answer}.`);
    } else {
      setAttempt(attempt + 1);
      setAIAttempt(aiAttempt + 1);
      setCurrentGuess("");
    }
  };

  // Official Wordle feedback algorithm
  function getFeedback(guess: string, answer: string): ("green" | "yellow" | "gray")[] {
    const feedback: ("green" | "yellow" | "gray")[] = Array(WORD_LENGTH).fill("gray");
    const answerArr = answer.split("");
    const guessArr = guess.split("");
    const used = Array(WORD_LENGTH).fill(false);
    // First pass: green
    for (let i = 0; i < WORD_LENGTH; i++) {
      if (guessArr[i] === answerArr[i]) {
        feedback[i] = "green";
        used[i] = true;
      }
    }
    // Second pass: yellow
    for (let i = 0; i < WORD_LENGTH; i++) {
      if (feedback[i] === "green") continue;
      for (let j = 0; j < WORD_LENGTH; j++) {
        if (!used[j] && guessArr[i] === answerArr[j]) {
          feedback[i] = "yellow";
          used[j] = true;
          break;
        }
      }
    }
    return feedback;
  }

  const getCellStyle = (guess: string, idx: number, answer: string) => {
    if (!guess) return { border: "1.5px solid #b3d0ff", background: "#fff" };
    const feedback = getFeedback(guess, answer);
    if (feedback[idx] === "green") return { background: "#a7ffb0", color: "#23272f" };
    if (feedback[idx] === "yellow") return { background: "#ffe07a", color: "#23272f" };
    return { background: "#e0e0e0", color: "#888" };
  };

  return (
    <div style={{ maxWidth: 700, margin: "3em auto", background: "#fff", borderRadius: 18, boxShadow: "0 4px 32px 0 rgba(80, 120, 200, 0.10)", padding: "2em 1.5em", border: "1.5px solid #e9f1ff", fontFamily: "'Inter', 'Nunito', 'Segoe UI', Arial, sans-serif" }}>
      <h2 style={{ color: "#7ecbff", fontWeight: 800, fontSize: "2em", marginBottom: "1em" }}>Wordle: Human vs AI</h2>
      <div style={{ marginBottom: "1.5em", color: "#888" }}>Guess the 5-letter word in 6 tries! You and the AI are racing to solve it first.</div>
      <form onSubmit={handleSubmit} style={{ marginBottom: "1.5em", display: 'flex', alignItems: 'center', gap: 12 }}>
        <input
          type="text"
          value={currentGuess}
          onChange={handleInput}
          maxLength={WORD_LENGTH}
          style={{
            fontSize: "1.3em",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            padding: "0.5em 1em",
            borderRadius: 8,
            border: "1.5px solid #b3d0ff",
            outline: "none",
            marginRight: 8,
            width: 160,
            background: "#f8fbff"
          }}
          disabled={!!status || !!aiStatus}
        />
        <button type="submit" style={{
          background: "linear-gradient(90deg, #7ecbff 0%, #b3e0ff 100%)",
          color: "#23272f",
          border: "none",
          borderRadius: 8,
          padding: "0.5em 1.2em",
          fontWeight: 700,
          fontSize: "1em",
          cursor: "pointer"
        }} disabled={!!status || !!aiStatus}>Guess</button>
      </form>
      <div style={{ display: 'flex', gap: 32, justifyContent: 'center', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* User guesses */}
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontWeight: 700, color: '#4f8cff', marginBottom: 8 }}>You</div>
          <div style={{ display: "grid", gridTemplateRows: `repeat(${MAX_ATTEMPTS}, 1fr)`, gap: 8 }}>
            {guesses.map((guess, rowIdx) => (
              <div key={rowIdx} style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                {Array.from({ length: WORD_LENGTH }).map((_, colIdx) => (
                  <div key={colIdx} style={{
                    width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1.3em", fontWeight: 700, borderRadius: 6, ...getCellStyle(guess, colIdx, answer)
                  }}>{guess[colIdx] || ""}</div>
                ))}
              </div>
            ))}
          </div>
          {status && <div style={{ marginTop: "1.5em", fontWeight: 700, color: status.includes("🎉") ? "#a7ffb0" : "#ff7a7a" }}>{status}</div>}
        </div>
        {/* AI guesses */}
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontWeight: 700, color: '#b3d0ff', marginBottom: 8 }}>AI Bot</div>
          <div style={{ display: "grid", gridTemplateRows: `repeat(${MAX_ATTEMPTS}, 1fr)`, gap: 8 }}>
            {aiGuesses.map((guess, rowIdx) => (
              <div key={rowIdx} style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                {Array.from({ length: WORD_LENGTH }).map((_, colIdx) => (
                  <div key={colIdx} style={{
                    width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1.3em", fontWeight: 700, borderRadius: 6, ...getCellStyle(guess, colIdx, answer)
                  }}>{guess[colIdx] || ""}</div>
                ))}
              </div>
            ))}
          </div>
          {aiStatus && <div style={{ marginTop: "1.5em", fontWeight: 700, color: aiStatus.includes("guessed") ? "#a7ffb0" : "#b3d0ff" }}>{aiStatus}</div>}
        </div>
      </div>
    </div>
  );
};

export default WordleGame;
