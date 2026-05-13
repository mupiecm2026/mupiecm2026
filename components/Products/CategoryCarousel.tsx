"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, IconButton, Typography } from "@mui/material";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import ProductCard, { Product } from "./ProductCard";


/**
 * Props:
 * - products: lista completa de produtos (cada um tem .category)
 * - cardWidth: largura do card (deve coincidir com a largura definida no ProductCard)
 * - gap: gap entre cards
 */
type Props = {
  products: Product[];
  cardWidth?: number;
  gap?: number;
};

export default function CategoryCarousel({ products, cardWidth = 260, gap = 16 }: Props) {
  // agrupa produtos por categoria (preserva ordem de aparecimento)
  const categories = React.useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of products) {
      const c = p.description && (p as any).category ? (p as any).category : "Sem categoria";
      if (!map.has(c)) map.set(c, []);
      map.get(c)!.push(p);
    }
    return Array.from(map.entries()).map(([category, items]) => ({ category, items }));
  }, [products]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {categories.map((c) => (
        <Box key={c.category}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
            {c.category}
          </Typography>
          <SingleRowCarousel items={c.items} cardWidth={cardWidth} gap={gap} />
        </Box>
      ))}
    </Box>
  );
}

/* ---------- componente interno: SingleRowCarousel ---------- */
function SingleRowCarousel({ items, cardWidth, gap }: { items: Product[]; cardWidth: number; gap: number }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollStart = useRef(0);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 8);
    setShowRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el) return;
    const onResize = () => updateArrows();
    window.addEventListener("resize", onResize);
    el.addEventListener("scroll", updateArrows, { passive: true });
    return () => {
      window.removeEventListener("resize", onResize);
      el.removeEventListener("scroll", updateArrows as any);
    };
  }, [updateArrows, items]);

  const scrollByPage = (dir: "left" | "right") => {
    const el = scrollerRef.current;
    if (!el) return;
    const distance = Math.round(el.clientWidth * 0.8);
    const target = dir === "left" ? el.scrollLeft - distance : el.scrollLeft + distance;
    el.scrollTo({ left: target, behavior: "smooth" });
  };

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    // evita seleção de texto enquanto arrasta (toggle de classe)
    const setDraggingClass = (dragging: boolean) => {
      if (dragging) {
        el.classList.add("is-dragging");
        // impede seleção global durante drag
        document.body.style.userSelect = "none";
        document.body.style.webkitUserSelect = "none";
      } else {
        el.classList.remove("is-dragging");
        document.body.style.userSelect = "";
        document.body.style.webkitUserSelect = "";
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      isDragging.current = true;
      el.style.scrollBehavior = "auto";
      startX.current = e.clientX;
      scrollStart.current = el.scrollLeft;
      setDraggingClass(true);
      (e.target as Element).setPointerCapture?.(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - startX.current;
      el.scrollLeft = scrollStart.current - dx;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      el.style.scrollBehavior = "smooth";
      setDraggingClass(false);
    };

    const onTouchStart = (e: TouchEvent) => {
      isDragging.current = true;
      startX.current = e.touches[0].clientX;
      scrollStart.current = el.scrollLeft;
      el.style.scrollBehavior = "auto";
      setDraggingClass(true);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      const dx = e.touches[0].clientX - startX.current;
      el.scrollLeft = scrollStart.current - dx;
    };
    const onTouchEnd = () => {
      isDragging.current = false;
      el.style.scrollBehavior = "smooth";
      setDraggingClass(false);
    };

    // prevenir dragstart nativo (pode selecionar imagem)
    const onNativeDragStart = (evt: DragEvent) => {
      evt.preventDefault();
    };

    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);

    el.addEventListener("dragstart", onNativeDragStart);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);

      el.removeEventListener("touchstart", onTouchStart as any);
      el.removeEventListener("touchmove", onTouchMove as any);
      el.removeEventListener("touchend", onTouchEnd as any);

      el.removeEventListener("dragstart", onNativeDragStart as any);
      // restaura caso algo tenha sido alterado
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
    };
  }, [items]);

  useEffect(() => {
    // ajusta visibilidade das setas quando montado/itens mudam
    setTimeout(updateArrows, 50);
  }, [updateArrows, items]);

  // teclado para navegar quando o scroller estiver em foco
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (document.activeElement !== el) return;
      if (e.key === "ArrowRight") scrollByPage("right");
      if (e.key === "ArrowLeft") scrollByPage("left");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const arrowStyle = {
    position: "absolute" as const,
    top: "50%",
    transform: "translateY(-50%)",
    background: "rgba(0,0,0,0.28)",
    color: "#fff",
    "&:hover": { background: "rgba(0,0,0,0.36)" },
  };

  return (
    <Box sx={{ position: "relative" }}>
      {showLeft && (
        <IconButton aria-label="anterior" onClick={() => scrollByPage("left")} sx={{ ...arrowStyle, left: 4, opacity: 0.88, zIndex: 3 }} size="large">
          <ChevronLeft />
        </IconButton>
      )}

      <Box
        ref={scrollerRef}
        tabIndex={0}
        role="region"
        aria-label="Carrossel de produtos"
        sx={{
          display: "flex",
          gap: `${gap}px`,
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          px: 1,
          py: 1,
          touchAction: "pan-x", // melhora o comportamento de toque horizontal
          // esconder scrollbar visualmente (ainda funcional)
          "&::-webkit-scrollbar": { height: 0 },
          msOverflowStyle: "none",
          scrollbarWidth: "none",
        }}
      >
        {items.map((p) => (
          <Box key={p.id} sx={{ scrollSnapAlign: "start", flex: "0 0 auto", width: `${cardWidth}px` }}>
            <ProductCard product={p} />
          </Box>
        ))}
      </Box>

      {showRight && (
        <IconButton aria-label="próximo" onClick={() => scrollByPage("right")} sx={{ ...arrowStyle, right: 4, opacity: 0.88, zIndex: 3 }} size="large">
          <ChevronRight />
        </IconButton>
      )}

      {/* estilo local para quando estiver arrastando (evita seleção acidental) */}
      <style>{`
        .is-dragging, .is-dragging * { user-select: none !important; -webkit-user-select: none !important; }
      `}</style>
    </Box>
  );
}