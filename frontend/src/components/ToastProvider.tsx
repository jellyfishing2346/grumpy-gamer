import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

interface Toast {
  id: number;
  message: string;
  type: "success" | "loss" | "draw" | "info";
}

interface ToastContextType {
  showToast: (message: string, type?: Toast["type"]) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
};

const toastColors: Record<Toast["type"], { bg: string; border: string; color: string; icon: string }> = {
  success: {
    bg: "rgba(40,224,123,0.12)",
    border: "rgba(40,224,123,0.3)",
    color: "#28e07b",
    icon: "✅",
  },
  loss: {
    bg: "rgba(255,126,103,0.12)",
    border: "rgba(255,126,103,0.3)",
    color: "#ff7e67",
    icon: "📊",
  },
  draw: {
    bg: "rgba(255,224,102,0.12)",
    border: "rgba(255,224,102,0.3)",
    color: "#ffe066",
    icon: "🤝",
  },
  info: {
    bg: "rgba(126,203,255,0.12)",
    border: "rgba(126,203,255,0.3)",
    color: "#7ecbff",
    icon: "ℹ️",
  },
};

let toastId = 0;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const { outcome, label } = (e as CustomEvent).detail;
      const type = outcome === "win" ? "success" : outcome === "loss" ? "loss" : "draw";
      showToast(label, type);
    };

    window.addEventListener("game-recorded", handler);
    return () => window.removeEventListener("game-recorded", handler);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div style={{
        position: "fixed",
        bottom: 32,
        right: 24,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "0.6em",
        pointerEvents: "none",
      }}>
        {toasts.map(toast => {
          const colors = toastColors[toast.type];
          return (
            <div
              key={toast.id}
              style={{
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                padding: "0.8em 1.4em",
                color: colors.color,
                fontWeight: 600,
                fontSize: "0.95em",
                fontFamily: "'DM Sans', 'Inter', sans-serif",
                backdropFilter: "blur(12px)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
                display: "flex",
                alignItems: "center",
                gap: "0.5em",
                animation: "toast-slide-in 0.3s ease",
                minWidth: 220,
              }}
            >
              <span>{colors.icon}</span>
              <span>{toast.message}</span>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes toast-slide-in {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
};