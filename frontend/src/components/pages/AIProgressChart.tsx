import React from "react";
// @ts-ignore
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  // @ts-ignore
} from "chart.js";
import { useDarkModeContext } from "../DarkModeProvider";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface AIProgressChartProps {
  gameLabels: string[];
  userWins: number[];
  userLosses: number[];
  userDraws: number[];
  aiWins: number[];
  aiLosses: number[];
  aiDraws: number[];
}

const AIProgressChart: React.FC<AIProgressChartProps> = ({
  gameLabels, userWins, userLosses, userDraws, aiWins, aiLosses, aiDraws,
}) => {
  const [darkMode] = useDarkModeContext();

  const textColor = darkMode ? "#f0f4ff" : "#23272f";
  const gridColor = darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const legendColor = darkMode ? "#f0f4ff" : "#23272f";

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: legendColor,
          font: { size: 12 },
          padding: 16,
        },
      },
      title: {
        display: true,
        text: "You vs Grumpy AI — Per Game",
        color: textColor,
        font: { size: 16, weight: "bold" as const },
        padding: { bottom: 16 },
      },
      tooltip: {
        backgroundColor: darkMode ? "rgba(15,17,23,0.95)" : "rgba(255,255,255,0.95)",
        titleColor: darkMode ? "#7ecbff" : "#1a1a2e",
        bodyColor: darkMode ? "rgba(255,255,255,0.7)" : "rgba(26,26,46,0.7)",
        borderColor: darkMode ? "rgba(126,203,255,0.2)" : "rgba(126,203,255,0.3)",
        borderWidth: 1,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { color: textColor, font: { size: 12 } },
        grid: { color: gridColor },
        border: { color: gridColor },
      },
      x: {
        ticks: { color: textColor, font: { size: 12 } },
        grid: { color: gridColor },
        border: { color: gridColor },
      },
    },
  };

  const chartData = {
    labels: gameLabels,
    datasets: [
      { label: "Your Wins", data: userWins, borderColor: "#4f8cff", backgroundColor: "rgba(79,140,255,0.15)", tension: 0.3, pointBackgroundColor: "#4f8cff" },
      { label: "Your Losses", data: userLosses, borderColor: "#ff7e67", backgroundColor: "rgba(255,126,103,0.15)", tension: 0.3, pointBackgroundColor: "#ff7e67" },
      { label: "Your Draws", data: userDraws, borderColor: "#ffe066", backgroundColor: "rgba(255,224,102,0.15)", tension: 0.3, pointBackgroundColor: "#ffe066" },
      { label: "AI Wins", data: aiWins, borderColor: "#7ecbff", backgroundColor: "rgba(126,203,255,0.15)", borderDash: [6, 2], tension: 0.3, pointBackgroundColor: "#7ecbff" },
      { label: "AI Losses", data: aiLosses, borderColor: "#ffb47e", backgroundColor: "rgba(255,180,126,0.15)", borderDash: [6, 2], tension: 0.3, pointBackgroundColor: "#ffb47e" },
      { label: "AI Draws", data: aiDraws, borderColor: "#b0b0b0", backgroundColor: "rgba(176,176,176,0.15)", borderDash: [6, 2], tension: 0.3, pointBackgroundColor: "#b0b0b0" },
    ],
  };

  return (
    <div style={{
      background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(126,203,255,0.03)",
      borderRadius: 12, padding: "1em",
    }}>
      <Line data={chartData} options={options} />
    </div>
  );
};

export default AIProgressChart;
