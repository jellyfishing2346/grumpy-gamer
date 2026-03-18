import React, { createContext, useContext, useState, useEffect } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => !!localStorage.getItem("access_token")
  );
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("session_expired")) {
      setSessionExpired(true);
      localStorage.removeItem("session_expired");
      setTimeout(() => setSessionExpired(false), 4000);
    }
  }, []);

  const login = (token: string) => {
    localStorage.setItem("access_token", token);
    setIsAuthenticated(true);
    setSessionExpired(false);
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {sessionExpired && (
        <div style={{
          position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)",
          zIndex: 9999,
          background: "rgba(255,126,103,0.12)",
          border: "1px solid rgba(255,126,103,0.3)",
          borderRadius: 12,
          padding: "0.8em 1.6em",
          color: "#ff7e67",
          fontWeight: 600,
          fontSize: "0.95em",
          fontFamily: "'DM Sans', 'Inter', sans-serif",
          backdropFilter: "blur(12px)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
          animation: "fadeIn 0.3s ease",
        }}>
          ⚠️ Session expired — please log in again
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
