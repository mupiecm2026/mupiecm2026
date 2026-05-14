// components/Products/CategoryCarousel.tsx
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

import {
  Box,
  IconButton,
  Typography,
} from "@mui/material";

import {
  ChevronLeft,
  ChevronRight,
} from "@mui/icons-material";

import ProductCard, { Product } from "./ProductCard";

type Props = {
  categories: {
    category: string;
    items: Product[];
  }[];

  cardWidth?: number;
  gap?: number;
};

export default function CategoryCarousel({
  categories,
  cardWidth = 260,
  gap = 16,
}: Props) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      {categories.map((c) => (
        <Box key={c.category}>
          <Typography
            variant="h6"
            sx={{
              mb: 2,
              fontWeight: 700,
              textTransform: "capitalize",
            }}
          >
            {c.category}
          </Typography>

          <SingleRowCarousel
            items={c.items}
            cardWidth={cardWidth}
            gap={gap}
          />
        </Box>
      ))}
    </Box>
  );
}

const SingleRowCarousel = React.memo(function SingleRowCarousel({
  items,
  cardWidth,
  gap,
}: {
  items: Product[];
  cardWidth: number;
  gap: number;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;

    if (!el) return;

    setShowLeft(el.scrollLeft > 8);

    setShowRight(
      el.scrollLeft + el.clientWidth < el.scrollWidth - 8
    );
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;

    if (!el) return;

    updateArrows();

    const onResize = () => updateArrows();

    window.addEventListener("resize", onResize);

    el.addEventListener("scroll", updateArrows, {
      passive: true,
    });

    return () => {
      window.removeEventListener("resize", onResize);

      el.removeEventListener(
        "scroll",
        updateArrows as EventListener
      );
    };
  }, [updateArrows]);

  const scrollByPage = (dir: "left" | "right") => {
    const el = scrollerRef.current;

    if (!el) return;

    const distance = Math.round(el.clientWidth * 0.8);

    const target =
      dir === "left"
        ? el.scrollLeft - distance
        : el.scrollLeft + distance;

    el.scrollTo({
      left: target,
      behavior: "smooth",
    });
  };

  return (
    <Box sx={{ position: "relative" }}>
      {showLeft && (
        <IconButton
          aria-label="Anterior"
          onClick={() => scrollByPage("left")}
          size="large"
          sx={{
            position: "absolute",
            top: "50%",
            left: 4,
            transform: "translateY(-50%)",
            zIndex: 3,
            background: "rgba(0,0,0,0.28)",
            color: "#fff",

            "&:hover": {
              background: "rgba(0,0,0,0.4)",
            },
          }}
        >
          <ChevronLeft />
        </IconButton>
      )}

      <Box
        ref={scrollerRef}
        sx={{
          display: "flex",
          gap: `${gap}px`,
          overflowX: "auto",
          overflowY: "hidden",

          scrollSnapType: "x mandatory",

          px: 1,
          py: 1,

          WebkitOverflowScrolling: "touch",

          "&::-webkit-scrollbar": {
            display: "none",
          },

          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {items.map((p) => (
          <Box
            key={p.id}
            sx={{
              flex: "0 0 auto",
              width: `${cardWidth}px`,
              scrollSnapAlign: "start",
            }}
          >
            <ProductCard product={p} />
          </Box>
        ))}
      </Box>

      {showRight && (
        <IconButton
          aria-label="Próximo"
          onClick={() => scrollByPage("right")}
          size="large"
          sx={{
            position: "absolute",
            top: "50%",
            right: 4,
            transform: "translateY(-50%)",
            zIndex: 3,
            background: "rgba(0,0,0,0.28)",
            color: "#fff",

            "&:hover": {
              background: "rgba(0,0,0,0.4)",
            },
          }}
        >
          <ChevronRight />
        </IconButton>
      )}
    </Box>
  );
});