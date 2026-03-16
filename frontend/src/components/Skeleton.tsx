import React from "react";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
}

const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = "1em",
  borderRadius = 8,
  style = {},
}) => {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: "linear-gradient(90deg, rgba(126,203,255,0.06) 25%, rgba(126,203,255,0.12) 50%, rgba(126,203,255,0.06) 75%)",
        backgroundSize: "200% 100%",
        animation: "skeleton-pulse 1.5s ease-in-out infinite",
        ...style,
      }}
    />
  );
};

// Inject keyframe animation once
if (typeof document !== "undefined") {
  const styleId = "skeleton-keyframes";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes skeleton-pulse {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `;
    document.head.appendChild(style);
  }
}

export default Skeleton;