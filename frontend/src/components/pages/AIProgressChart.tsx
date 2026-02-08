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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const data = {
  labels: ["Game 1", "Game 2", "Game 3", "Game 4", "Game 5", "Game 6", "Game 7"],
  datasets: [
    {
      label: "Your Accuracy (%)",
      data: [70, 75, 80, 78, 82, 85, 88],
      borderColor: "#4f8cff",
      backgroundColor: "rgba(79,140,255,0.2)",
      tension: 0.3,
    },
    {
      label: "AI Accuracy (%)",
      data: [65, 68, 72, 76, 80, 84, 90],
      borderColor: "#ff7e67",
      backgroundColor: "rgba(255,126,103,0.2)",
      tension: 0.3,
    },
  ],
};

const options = {
  responsive: true,
  plugins: {
    legend: {
      position: "top" as const,
    },
    title: {
      display: true,
      text: "AI Learning Progress (Accuracy Over Time)",
      color: "#23272f",
      font: { size: 20 },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      max: 100,
      ticks: { color: "#23272f" },
    },
    x: {
      ticks: { color: "#23272f" },
    },
  },
};

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
  gameLabels,
  userWins,
  userLosses,
  userDraws,
  aiWins,
  aiLosses,
  aiDraws,
}) => {
  const chartData = {
    labels: gameLabels,
    datasets: [
      {
        label: "Your Wins",
        data: userWins,
        borderColor: "#4f8cff",
        backgroundColor: "rgba(79,140,255,0.2)",
        tension: 0.3,
      },
      {
        label: "Your Losses",
        data: userLosses,
        borderColor: "#ff7e67",
        backgroundColor: "rgba(255,126,103,0.2)",
        tension: 0.3,
      },
      {
        label: "Your Draws",
        data: userDraws,
        borderColor: "#a0a0a0",
        backgroundColor: "rgba(160,160,160,0.2)",
        tension: 0.3,
      },
      {
        label: "AI Wins",
        data: aiWins,
        borderColor: "#7ecbff",
        backgroundColor: "rgba(126,203,255,0.2)",
        borderDash: [6, 2],
        tension: 0.3,
      },
      {
        label: "AI Losses",
        data: aiLosses,
        borderColor: "#ffb47e",
        backgroundColor: "rgba(255,180,126,0.2)",
        borderDash: [6, 2],
        tension: 0.3,
      },
      {
        label: "AI Draws",
        data: aiDraws,
        borderColor: "#d0d0d0",
        backgroundColor: "rgba(208,208,208,0.2)",
        borderDash: [6, 2],
        tension: 0.3,
      },
    ],
  };
  return (
    <div style={{ margin: "2em auto", maxWidth: 600 }}>
      <Line data={chartData} options={options} />
    </div>
  );
};

export default AIProgressChart;
