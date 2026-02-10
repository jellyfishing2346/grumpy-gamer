import { useDarkModeContext } from "./DarkModeProvider";

export function useDarkModeStyle(light: React.CSSProperties, dark: React.CSSProperties) {
  const [darkMode] = useDarkModeContext();
  return darkMode ? { ...light, ...dark } : light;
}
