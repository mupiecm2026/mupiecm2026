// src/components/HeroSearch.tsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  InputBase,
  IconButton,
  Typography,
  useTheme,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import Image from "next/image";
import banner from "../public/banner.png";

type Props = {
  logoSrc?: string;
  title?: string;
  subtitle?: string;
  placeholder?: string;
  initial?: string;
  onSearch?: (q: string) => void;
  preferLogoBehind?: boolean;
};

export default function HeroSearch({
  logoSrc = "/logo.png",
  title = "Mupi",
  subtitle,
  placeholder = "Pesquise produtos, marcas ou categorias...",
  initial = "",
  onSearch,
  preferLogoBehind = true,
}: Props) {
  const theme = useTheme();
  const [query, setQuery] = useState(initial);
  const [debounced, setDebounced] = useState(initial);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    onSearch?.(debounced);
  }, [debounced, onSearch]);

  const bg = useMemo(
    () =>
      `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
    [theme.palette.background]
  );

  return (
    <Box
      sx={{
        width: "100%",
        position: "relative",
        mb: 4,
      }}
      role="banner"
      aria-label="Cabeçalho da loja"
    >
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: { xs: 220, sm: 500 },
          overflow: "hidden",
          borderRadius: 4,
        }}
      >
        <Image
          src={banner}
          alt="Banner Mupi"
          fill
          priority
          style={{
            objectFit: "cover",
          }}
        />

        <Box
          sx={{
            position: "absolute",
            top: {xs:"85%", sm: "90%"},
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "100%",
            maxWidth: 1080,
            px: 2,
            zIndex: 2,
          }}
        >
          <Paper
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              onSearch?.(query.trim());
              setDebounced(query.trim());
            }}
            elevation={6}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 1.25,
              py: 0.5,
              borderRadius: 3,
              background: bg,
              border: "1px solid rgba(0,0,0,0.06)",
              boxShadow:
                "0 6px 30px rgba(15,23,42,0.12), inset 0 1px 0 rgba(255,255,255,0.02)",
            }}
            role="search"
            aria-label="Barra de pesquisa de produtos"
          >
            <InputBase
              aria-label="Pesquisar produtos"
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              sx={{
                ml: 1,
                flex: 1,
                fontSize: 15,
                color: "text.primary",
                "& input::placeholder": { color: "text.secondary" },
              }}
              inputProps={{ maxLength: 120 }}
            />

            <IconButton
              type="submit"
              aria-label="Pesquisar"
              sx={{
                background: "rgba(0,0,0,0.06)",
                color: "text.primary",
                borderRadius: 1.25,
                "&:hover": { background: "rgba(0,0,0,0.08)" },
                ml: 0.5,
              }}
            >
              <SearchIcon />
            </IconButton>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}