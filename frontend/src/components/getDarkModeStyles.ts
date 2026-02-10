export function getDarkModeStyles(darkMode: boolean, light: React.CSSProperties, dark: React.CSSProperties): React.CSSProperties {
  return darkMode ? { ...light, ...dark } : light;
}
