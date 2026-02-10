import { useDarkModeContext } from "./DarkModeProvider";

export function useDarkModeStyles<T extends Record<string, React.CSSProperties>>(
  styles: T,
  darkOverrides: Partial<T>
): [T, boolean] {
  const [darkMode] = useDarkModeContext();
  const merged = { ...styles };
  if (darkMode) {
    for (const key in darkOverrides) {
      merged[key] = { ...merged[key], ...darkOverrides[key] };
    }
  }
  return [merged, darkMode];
}
