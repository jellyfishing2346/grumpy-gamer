import React, { useState, useEffect } from "react";
import { useDarkModeContext } from "./DarkModeProvider";
import { getDarkModeStyles } from "./getDarkModeStyles";
import API_URL from "../config/api";

interface GameStat {
  game: string;
  wins: number;
  losses: number;
  draws: number;
  total: number;
}

interface CoachFeedback {
  glows: string[];
  grows: string[];
  summary: string;
}

const AICoach: React.FC = () => {
  const [stats, setStats] = useState<GameStat[]>([]);
  const [feedback, setFeedback] = useState<CoachFeedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [darkMode] = useDarkModeContext();

  useEffect(() => {
    async function loadStats() {
      setFetching(true);
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch(`${API_URL}/api/stats/summary`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats || []);
        }
      } catch (err) {
        console.error("Failed to fetch stats for AI coach:", err);
      }
      setFetching(false);
    }
    loadStats();
  }, []);

  const generateFeedback = async () => {
    if (!stats.length) return;
    setLoading(true);
    setFeedback(null);

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${API_URL}/api/stats/coach`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const parsed = await response.json();
      setFeedback(parsed);
    } catch (err) {
      console.error("Failed to get AI coach feedback:", err);
      setFeedback({
        glows: ["You're showing up and playing — that's what matters!"],
        grows: ["Keep playing more games to get personalized tips."],
        summary: "Every game is a chance to learn something new.",
      });
    }
    setLoading(false);
  };

  const cardStyle: React.CSSProperties = {
    borderRadius: 16,
    padding: "1.5em",
    marginTop: "2em",
    border: "1.5px solid #e9f1ff",
    background: "#fff",
    textAlign: "left",
  };

  const darkCard: React.CSSProperties = {
    background: "#23272f",
    border: "1.5px solid #444",
    color: "#f5f6fa",
  };

  const hasStats = stats.some((g) => g.total > 0);

  return (
    <div style={getDarkModeStyles(darkMode, cardStyle, { ...cardStyle, ...darkCard })}>
      <h3 style={{ color: "#7ecbff", marginBottom: "0.5em", fontSize: "1.3em", fontWeight: 700 }}>
        🤖 AI Coach
      </h3>
      <p style={{ color: darkMode ? "#aaa" : "#666", marginBottom: "1em", fontSize: "0.95em" }}>
        Get personalized glows and grows based on your game history.
      </p>

      {fetching ? (
        <div style={{ color: darkMode ? "#aaa" : "#888" }}>Loading your stats...</div>
      ) : !hasStats ? (
        <div style={{ color: darkMode ? "#aaa" : "#888" }}>
          Play some games first to get coaching feedback!
        </div>
      ) : (
        <>
          <button
            onClick={generateFeedback}
            disabled={loading}
            style={{
              padding: "0.7em 1.5em",
              borderRadius: 10,
              background: loading ? "#aaa" : "linear-gradient(90deg, #7ecbff, #4f8cff)",
              color: "#fff",
              fontWeight: 700,
              fontSize: "1em",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              marginBottom: "1.2em",
            }}
          >
            {loading ? "Analyzing your play..." : "✨ Get My Feedback"}
          </button>

          {feedback && (
            <div>
              <div style={{ marginBottom: "1em" }}>
                <div style={{ fontWeight: 700, color: "#28a745", marginBottom: "0.4em", fontSize: "1.05em" }}>
                  🌟 Glows (What's going well)
                </div>
                <ul style={{ margin: 0, paddingLeft: "1.2em" }}>
                  {feedback.glows.map((g, i) => (
                    <li key={i} style={{ color: darkMode ? "#28e07b" : "#155724", marginBottom: "0.3em" }}>
                      {g}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ marginBottom: "1em" }}>
                <div style={{ fontWeight: 700, color: "#ffc107", marginBottom: "0.4em", fontSize: "1.05em" }}>
                  🌱 Grows (Areas to improve)
                </div>
                <ul style={{ margin: 0, paddingLeft: "1.2em" }}>
                  {feedback.grows.map((g, i) => (
                    <li key={i} style={{ color: darkMode ? "#ffe066" : "#856404", marginBottom: "0.3em" }}>
                      {g}
                    </li>
                  ))}
                </ul>
              </div>

              <div
                style={{
                  background: darkMode ? "#181a20" : "#f0f7ff",
                  borderRadius: 8,
                  padding: "0.8em 1em",
                  color: darkMode ? "#7ecbff" : "#3a7bd5",
                  fontStyle: "italic",
                  fontSize: "0.95em",
                }}
              >
                💬 {feedback.summary}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AICoach;