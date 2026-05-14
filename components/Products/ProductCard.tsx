// components/Products/ProductCard.tsx
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
import { useTranslatedText } from "../../lib/utils/translation";

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
  size?: "default" | "small";
};

function ProductCardComponent({
  product,
  defaultQty = 1,
  onAdded,
  size = "default",
}: Props) {
  const { addItem } = useCart();

  const isSmall = size === "small";

  const cardWidth = isSmall ? "100%" : 260;
  const maxCardWidth = isSmall ? 220 : 260;

  const cardHeight = isSmall ? 280 : 360;
  const imageHeight = isSmall ? 120 : 160;

  const titleVariant = isSmall ? "body1" : "subtitle1";
  const priceVariant = isSmall ? "body2" : "subtitle2";

  const translatedTitle = useTranslatedText(product.title || "", "pt");
  const translatedDescription = useTranslatedText(product.description || "", "pt");

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

  const shortDesc = translatedDescription
    ? translatedDescription.length > 100
      ? translatedDescription.slice(0, 97).trimEnd() + "..."
      : translatedDescription
    : "";

  return (
    <Card
      component={Link}
      href={`/produto/${product.id}`}
      sx={{
        width: cardWidth,
        maxWidth: maxCardWidth,
        height: cardHeight,

        display: "flex",
        flexDirection: "column",

        borderRadius: 2,

        overflow: "hidden",

        boxShadow: 3,

        border: "2px solid transparent",

        transition:
          "transform 0.2s ease, border-color 0.2s ease",

        textDecoration: "none",

        "&:hover": {
          borderColor: "#2196f3",
          transform: "translateY(-2px)",
        },
      }}
    >
      <CardMedia
        component="img"
        src={product.image ?? "/placeholder.png"}
        alt={product.title}
        loading="lazy"
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        sx={{
          height: imageHeight,
          objectFit: "contain",
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

          overflow: "hidden",
        }}
      >
        <Typography
          variant={titleVariant}
          sx={{
            fontWeight: 700,
            lineHeight: 1.2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            wordBreak: "break-word",
          }}
        >
          {translatedTitle}
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
          }}
        >
          {shortDesc}
        </Typography>

        <Box
          sx={{
            mt: "auto",

            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography
              variant={priceVariant}
              sx={{ fontWeight: 700 }}
            >
              R$ {product.price.toFixed(2).replace(".", ",")}
            </Typography>

            <Typography
              variant="caption"
              color="text.secondary"
            >
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

            backgroundColor: "#27ae60",
            color: "#fff",

            "&:hover": {
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

const ProductCard = React.memo(ProductCardComponent);

export default ProductCard;