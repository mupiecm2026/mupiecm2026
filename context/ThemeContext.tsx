// src\context\ThemeContext.tsx
"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { ThemeProvider as MuiThemeProvider, createTheme } from "@mui/material/styles";

type ThemeMode = "light" | "dark";

interface ThemeContextProps {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const useThemeContext = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeContext deve ser usado dentro de ThemeProvider");
  return ctx;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<ThemeMode>("light");

  const toggleTheme = () => setMode(prev => (prev === "light" ? "dark" : "light"));

  // Persistência simples
  useEffect(() => {
    const saved = typeof window !== "undefined" ? (localStorage.getItem("mode") as ThemeMode | null) : null;
    if (saved) setMode(saved);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("mode", mode);
      // aplica a classe diretamente no body
      document.body.classList.remove("theme-light", "theme-dark");
      document.body.classList.add(mode === "light" ? "theme-light" : "theme-dark");
    }
  }, [mode]);

  const muiTheme = createTheme({
    palette: {
      mode,
      primary: { main: "#2D9CDB" },
      secondary: { main: "#27AE60" },
      error: { main: "#EB5757" },
      warning: { main: "#F2994A" },
      background: {
        default: mode === "light" ? "#ebebeb" : "#121212",
        paper: mode === "light" ? "#FFFFFF" : "#1E1E1E",
      },
      text: {
        primary: mode === "light" ? "#1A1A1A" : "#F5F5DC",
        secondary: mode === "light" ? "#555555" : "#CCCCCC",
      },
    },
    typography: { fontFamily: "Inter, sans-serif" },
  });

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={muiTheme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};