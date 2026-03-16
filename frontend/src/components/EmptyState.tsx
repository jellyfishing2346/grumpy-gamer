import React from "react";
import { useNavigate } from "react-router-dom";
import { useDarkModeContext } from "./DarkModeProvider";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionRoute?: string;
  secondaryLabel?: string;
  secondaryRoute?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon = "🎮",
  title,
  description,
  actionLabel,
  actionRoute,
  secondaryLabel,
  secondaryRoute,
}) => {
  const navigate = useNavigate();
  const [darkMode] = useDarkModeContext();

  const textPrimary = darkMode ? "#f0f4ff" : "#1a1a2e";
  const textMuted = darkMode ? "rgba(255,255,255,0.5)" : "rgba(26,26,46,0.55)";
  const cardBg = darkMode ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.95)";
  const cardBorder = darkMode ? "1px solid rgba(126,203,255,0.1)" : "1px solid rgba(126,203,255,0.2)";

  return (
    <div style={{
      background: cardBg, border: cardBorder, borderRadius: 20,
      padding: "3.5em 2em", textAlign: "center",
      backdropFilter: "blur(8px)",
      boxShadow: darkMode ? "0 2px 8px rgba(0,0,0,0.2)" : "0 2px 8px rgba(80,120,200,0.06)",
    }}>
      {/* Illustrated icon with glow */}
      <div style={{ position: "relative", display: "inline-block", marginBottom: "1.5em" }}>
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 100, height: 100, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(126,203,255,0.15) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          width: 80, height: 80, borderRadius: "50%",
          background: darkMode ? "rgba(126,203,255,0.08)" : "rgba(126,203,255,0.12)",
          border: "1px solid rgba(126,203,255,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "2.2em",
          position: "relative",
        }}>
          {icon}
        </div>
      </div>

      {/* Text */}
      <h2 style={{
        fontSize: "1.3em", fontWeight: 700,
        color: textPrimary, marginBottom: "0.5em",
        letterSpacing: "-0.01em",
      }}>
        {title}
      </h2>
      <p style={{
        color: textMuted, fontSize: "0.95em",
        lineHeight: 1.7, maxWidth: 340,
        margin: "0 auto 2em",
      }}>
        {description}
      </p>

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.8em", justifyContent: "center", flexWrap: "wrap" }}>
        {actionLabel && actionRoute && (
          <button
            onClick={() => navigate(actionRoute)}
            style={{
              padding: "0.75em 1.8em", borderRadius: 50, border: "none",
              background: "linear-gradient(90deg, #7ecbff, #4fa3d1)",
              color: "#1a1a2e", fontWeight: 700, fontSize: "0.95em",
              cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
            }}
          >
            {actionLabel}
          </button>
        )}
        {secondaryLabel && secondaryRoute && (
          <button
            onClick={() => navigate(secondaryRoute)}
            style={{
              padding: "0.75em 1.8em", borderRadius: 50,
              border: darkMode ? "1px solid rgba(126,203,255,0.2)" : "1px solid rgba(126,203,255,0.3)",
              background: "transparent",
              color: darkMode ? "#7ecbff" : "#4fa3d1",
              fontWeight: 600, fontSize: "0.95em",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default EmptyState;