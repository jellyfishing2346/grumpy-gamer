import React, { useEffect, useState } from "react";
import API_URL from "../../config/api";

interface ModelMetrics {
  id: string;
  game: string;
  algorithm: string;
  timesteps: number;
  win_rate_random: number | null;
  loss_rate_random: number | null;
  draw_rate_random: number | null;
  training_time_seconds: number;
  model_size_mb: number | null;
  model_exists: boolean;
  status: string;
}

const statusColor: Record<string, string> = {
  trained: "#4ade80",
  needs_gpu: "#fbbf24",
  in_progress: "#7ecbff",
};

const statusLabel: Record<string, string> = {
  trained: "✅ Trained",
  needs_gpu: "⚠️ Needs GPU",
  in_progress: "🔄 Training",
};

const AIMetrics: React.FC = () => {
  const [models, setModels] = useState<ModelMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/rl/metrics`)
      .then((r) => r.json())
      .then((data) => {
        setModels(data.models || []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load metrics");
        setLoading(false);
      });
  }, []);

  const containerStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: "#0f1117",
    color: "#e8f4f8",
    fontFamily: "'DM Sans', 'Inter', sans-serif",
    padding: "2rem",
  };

  const headerStyle: React.CSSProperties = {
    textAlign: "center",
    marginBottom: "2rem",
  };

  const cardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(126,203,255,0.1)",
    borderRadius: 16,
    padding: "1.5rem",
    marginBottom: "1rem",
  };

  const barContainerStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.06)",
    borderRadius: 8,
    height: 12,
    width: "100%",
    overflow: "hidden",
    marginTop: "0.5rem",
  };

  if (loading) {
    return (
      <div style={{ ...containerStyle, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "rgba(255,255,255,0.5)" }}>Loading metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...containerStyle, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#ff7e67" }}>{error}</p>
      </div>
    );
  }

  const trained = models.filter((m) => m.status === "trained");
  const totalTimesteps = models.reduce((s, m) => s + m.timesteps, 0);
  const avgWinRate = trained.filter((m) => m.win_rate_random !== null)
    .reduce((s, m) => s + (m.win_rate_random || 0), 0) /
    (trained.filter((m) => m.win_rate_random !== null).length || 1);

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#7ecbff", marginBottom: "0.5rem" }}>
          🤖 AI Training Metrics
        </h1>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "1rem" }}>
          Reinforcement Learning model performance across all games
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { label: "Models Trained", value: trained.length, icon: "🎯" },
          { label: "Total Timesteps", value: `${(totalTimesteps / 1000).toFixed(0)}k`, icon: "⚡" },
          { label: "Avg Win Rate", value: `${avgWinRate.toFixed(0)}%`, icon: "🏆" },
          { label: "Games Covered", value: models.length, icon: "🎮" },
        ].map((stat) => (
          <div key={stat.label} style={{ ...cardStyle, textAlign: "center" }}>
            <div style={{ fontSize: "1.8rem" }}>{stat.icon}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#7ecbff" }}>{stat.value}</div>
            <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Model Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
        {models.map((model) => (
          <div key={model.id} style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>{model.game}</h3>
              <span style={{
                fontSize: "0.75rem",
                padding: "0.25em 0.75em",
                borderRadius: 50,
                background: `${statusColor[model.status]}22`,
                color: statusColor[model.status],
                border: `1px solid ${statusColor[model.status]}44`,
              }}>
                {statusLabel[model.status] || model.status}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "1rem", fontSize: "0.85rem" }}>
              <div style={{ color: "rgba(255,255,255,0.5)" }}>Algorithm</div>
              <div style={{ fontWeight: 600 }}>{model.algorithm}</div>
              <div style={{ color: "rgba(255,255,255,0.5)" }}>Timesteps</div>
              <div style={{ fontWeight: 600 }}>{model.timesteps > 0 ? `${(model.timesteps / 1000).toFixed(0)}k` : "—"}</div>
              <div style={{ color: "rgba(255,255,255,0.5)" }}>Training Time</div>
              <div style={{ fontWeight: 600 }}>{model.training_time_seconds > 0 ? `${Math.round(model.training_time_seconds / 60)}m` : "—"}</div>
              <div style={{ color: "rgba(255,255,255,0.5)" }}>Model Size</div>
              <div style={{ fontWeight: 600 }}>{model.model_size_mb ? `${model.model_size_mb} MB` : "—"}</div>
            </div>

            {model.win_rate_random !== null && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>Win Rate vs Random</span>
                  <span style={{ fontWeight: 700, color: "#4ade80" }}>{model.win_rate_random}%</span>
                </div>
                <div style={barContainerStyle}>
                  <div style={{
                    height: "100%",
                    width: `${model.win_rate_random}%`,
                    background: "linear-gradient(90deg, #4ade80, #22c55e)",
                    borderRadius: 8,
                    transition: "width 1s ease",
                  }} />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginTop: "0.75rem", marginBottom: "0.25rem" }}>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>Loss Rate</span>
                  <span style={{ fontWeight: 700, color: "#f87171" }}>{model.loss_rate_random}%</span>
                </div>
                <div style={barContainerStyle}>
                  <div style={{
                    height: "100%",
                    width: `${model.loss_rate_random || 0}%`,
                    background: "linear-gradient(90deg, #f87171, #ef4444)",
                    borderRadius: 8,
                  }} />
                </div>
              </div>
            )}

            {model.status === "needs_gpu" && (
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.82rem", marginTop: "0.5rem" }}>
                Requires GPU training (millions of timesteps)
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AIMetrics;