"use client";
import React from "react";
import {
  Card,
  CardContent,
  CardActions,
  CardMedia,
  Typography,
  Button,
  Box,
} from "@mui/material";
import Link from "next/link";
import { useCart } from "../../context/Products/CartContext";

export type Product = {
  id: number | string;
  title: string;
  price: number;
  description?: string;
  image?: string;
};

type Props = {
  product: Product;
  defaultQty?: number;
  onAdded?: (item: Product, qty: number) => void;
  size?: 'default' | 'small';
};

/**
 * Card de produto com altura fixa.
 * - largura: 260 (como antes)
 * - altura total fixa: 360 (ajuste se quiser)
 * - imagem com altura fixa e draggable desabilitado
 */
export default function ProductCard({ product, defaultQty = 1, onAdded, size = 'default' }: Props) {
  const { addItem } = useCart();

  const isSmall = size === 'small';
  const cardWidth = isSmall ? '100%' : 260;
  const maxCardWidth = isSmall ? 220 : 260;
  const cardHeight = isSmall ? 280 : 360;
  const imageHeight = isSmall ? 120 : 160;
  const titleVariant = isSmall ? 'body1' : 'subtitle1';
  const priceVariant = isSmall ? 'body2' : 'subtitle2';

  const handleAdd = () => {
    addItem(
      {
        id: product.id,
        title: product.title,
        price: product.price,
        image: product.image,
        meta: { raw: product },
      },
      defaultQty
    );
    onAdded?.(product, defaultQty);
  };

  const shortDesc = product.description
    ? product.description.length > 100
      ? product.description.slice(0, 97).trimEnd() + "..."
      : product.description
    : "";

  return (
    <Card
      component={Link}
      href={`/produto/${product.id}`}
      sx={{
        width: cardWidth,
        maxWidth: maxCardWidth,
        height: cardHeight, // altura fixa do card
        display: "flex",
        flexDirection: "column",
        borderRadius: 2,
        boxShadow: 3,
        overflow: "hidden",
        transition: "border 0.2s ease",
        border: "2px solid transparent",
        textDecoration: "none",
        '&:hover': {
          borderColor: "#2196f3", // azul clara
          transform: "translateY(-2px)",
        },
        touchAction: "pan-y", // permite scroll vertical em mobile
      }}
    >
      {/* imagem com altura fixa */}
      <CardMedia
        component="img"
        src={product.image ?? "/placeholder.png"}
        alt={product.title}
        draggable={false} // impede arrastar a imagem como recurso nativo do navegador
        onDragStart={(e) => e.preventDefault()}
        sx={{
          height: imageHeight,
          objectFit: "cover",
          backgroundColor: "rgba(0,0,0,0.04)",
          userSelect: "none",
          WebkitUserDrag: "none",
        }}
      />

      <CardContent
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 1,
          // garante que o conteúdo não expanda além da altura fixa
          overflow: "hidden",
        }}
      >
        <Typography variant={titleVariant} sx={{ fontWeight: 700, lineHeight: 1.2 }}>
          {product.title}
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            fontSize: isSmall ? 12 : 13,
            lineHeight: 1.3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            userSelect: "none", // evita seleção de texto durante drag
          }}
        >
          {shortDesc}
        </Typography>

        <Box sx={{ mt: "auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box>
            <Typography variant={priceVariant} sx={{ fontWeight: 700 }}>
              R$ {product.price.toFixed(2).replace(".", ",")}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              à vista
            </Typography>
          </Box>
        </Box>
      </CardContent>

      <CardActions sx={{ px: 2, py: 1 }}>
        <Button
          fullWidth
          variant="contained"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleAdd();
          }}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 700,
            fontFamily: "'Roboto', sans-serif",
            backgroundColor: "#27ae60",
            color: "#ffffff",
            '&:hover': {
              backgroundColor: "#1E874B",
            },
          }}
        >
          Adicionar
        </Button>
      </CardActions>
    </Card>
  );
}