import React, { createContext, useContext } from "react";
import { useDarkMode } from "../hooks/useDarkMode";

const DarkModeContext = createContext<ReturnType<typeof useDarkMode> | undefined>(undefined);

export const DarkModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const darkModeState = useDarkMode();
  return (
    <DarkModeContext.Provider value={darkModeState}>
      {children}
    </DarkModeContext.Provider>
  );
};

export function useDarkModeContext() {
  const ctx = useContext(DarkModeContext);
  if (!ctx) throw new Error("useDarkModeContext must be used within DarkModeProvider");
  return ctx;
}
