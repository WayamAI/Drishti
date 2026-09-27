import * as React from "react";

/* The theme context and its types; see auth-context.ts for why they live apart. */

export type Theme = "light" | "dark";

export type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

export const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);
