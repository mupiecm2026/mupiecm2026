"use client";
import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Box,
  Button,
  Container,
  Grid,
  Typography,
  Breadcrumbs,
  Link as MuiLink,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
  CardMedia,
  CircularProgress,
  Paper,
  IconButton,
} from "@mui/material";
import {
  Favorite,
  FavoriteBorder,
  Share,
  ExpandMore,
  ShoppingCart,
  Search,
} from "@mui/icons-material";
import Link from "next/link";
import ProductCard from "../../../components/ProductCard";
import { useCart } from "../../../context/CartContext";
import { useAuth } from "../../../context/AuthContext";
import { getFavorites, toggleFavorite, isProductFavorited } from "../../../lib/utils/favorites";
import { logger } from "../../../lib/utils/logger";

const defaultSimilarProducts = [
  { id: 2, title: "Produto Similar 1", price: 89.99, image: "https://via.placeholder.com/300x300?text=Similar+1" },
  { id: 3, title: "Produto Similar 2", price: 109.99, image: "https://via.placeholder.com/300x300?text=Similar+2" },
  { id: 4, title: "Produto Similar 3", price: 79.99, image: "https://via.placeholder.com/300x300?text=Similar+3" },
];

export default function ProductDetails() {
  const params = useParams();
  const router = useRouter();
  const { addItem } = useCart();
  const { user } = useAuth();

  const [selectedImage, setSelectedImage] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoomActive, setZoomActive] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });
  const [imageBox, setImageBox] = useState({ width: 0, height: 0 });
  const [similarProducts, setSimilarProducts] = useState<any[]>(defaultSimilarProducts);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement | null>(null);

  const productId = params.id as string;

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/products/${productId}`);
        if (!response.ok) {
          throw new Error("Produto não encontrado");
        }
        const data : any = await response.json();
        setProduct(data.product);
      } catch (err: any) {
        setError(err.message || "Erro ao carregar produto");
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  useEffect(() => {
    if (!product?.category) return;
    const fetchSimilar = async () => {
      setLoadingSimilar(true);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_PRODUCTS_URL;
        if (!baseUrl) return;
        const response = await fetch(`${baseUrl}/products/category/${encodeURIComponent(product.category)}`);
        if (!response.ok) return;
        const data: any = await response.json();
        const items = (data.products || [])
          .filter((item: any) => String(item.id) !== String(product.id))
          .slice(0, 4)
          .map((item: any) => ({
            id: item.id,
            title: item.title,
            price: item.price,
            image: item.images?.[0] || item.thumbnail || "/placeholder.png",
          }));
        if (items.length) setSimilarProducts(items);
      } catch (err) {
        console.warn("Falha ao carregar produtos semelhantes", err);
      } finally {
        setLoadingSimilar(false);
      }
    };

    fetchSimilar();
  }, [product]);

  const handleAddToCart = () => {
    if (hasSizes && !selectedSize) {
      alert("Selecione um tamanho");
      return;
    }
    addItem({
      id: product.id,
      title: product.title,
      price: product.price,
      image: product.images[0],
      meta: hasSizes ? { size: selectedSize } : {},
    }, quantity);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.title,
          url: window.location.href,
        });
      } catch (err) {
        logger.warn("Erro ao compartilhar", { error: err });
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copiado!");
    }
  };

  const isLoggedIn = !!user;

  useEffect(() => {
    if (product && isLoggedIn) {
      setIsFavorited(isProductFavorited(product.id));
    }
  }, [product, isLoggedIn]);

  const handleFavorite = () => {
    if (!isLoggedIn) {
      alert("Faça login para favoritar produtos");
      return;
    }
    if (!product) return;

    toggleFavorite({
      id: product.id,
      title: product.title,
      price: product.price,
      image: product.images?.[0] || product.thumbnail,
      category: product.category,
    });

    setIsFavorited((current) => !current);
  };

  const hasSizes = Array.isArray(product?.sizes) && product.sizes.length > 0;

  useLayoutEffect(() => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    setImageBox({ width: rect.width, height: rect.height });
  }, [product]);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    setZoomPos({ x, y });
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4, maxWidth: 1400 }}>
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 12 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {error}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tente recarregar a página ou volte para a loja.
          </Typography>
          <Button variant="contained" sx={{ mt: 2 }} onClick={() => router.push("/")}>
            Voltar para a Loja
          </Button>
        </Box>
      ) : product ? (
        <div>
          <Breadcrumbs sx={{ mb: 2 }}>
            <MuiLink component={Link} href="/" underline="hover">
              Home
            </MuiLink>
            <MuiLink component={Link} href="/categoria" underline="hover">
              {product.category}
            </MuiLink>
            <Typography color="text.primary">{product.title}</Typography>
          </Breadcrumbs>

          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 2 }}>
                <Grid container spacing={1}>
                  {product.images.map((img: any, index: any) => (
                    <Grid item xs={3} key={index}>
                      <Box
                        component="img"
                        src={img}
                        alt={`${product.title} ${index + 1}`}
                        sx={{
                          width: "100%",
                          height: 80,
                          objectFit: "cover",
                          borderRadius: 1,
                          cursor: "pointer",
                          border: selectedImage === index ? "2px solid #1976d2" : "2px solid transparent",
                          "&:hover": { borderColor: "#1976d2" },
                        }}
                        onClick={() => setSelectedImage(index)}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>

              <Box
                ref={imageContainerRef}
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setZoomActive(true)}
                onMouseLeave={() => setZoomActive(false)}
                sx={{
                  position: "relative",
                  borderRadius: 2,
                  overflow: "hidden",
                  cursor: "zoom-in",
                }}
              >
                <img
                  src={product.images[selectedImage]}
                  alt={product.title}
                  style={{
                    width: "100%",
                    height: 500,
                    objectFit: "cover",
                    transition: "transform 0.3s ease",
                  }}
                />
                {zoomActive && imageBox.width > 0 && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: zoomPos.y - 80,
                      left: zoomPos.x - 80,
                      width: 160,
                      height: 160,
                      borderRadius: "50%",
                      border: "2px solid rgba(255,255,255,0.9)",
                      boxShadow: "0 0 0 9999px rgba(0,0,0,0.15)",
                      overflow: "hidden",
                      pointerEvents: "none",
                      bgcolor: "rgba(255,255,255,0.05)",
                      backgroundImage: `url(${product.images[selectedImage]})`,
                      backgroundSize: `${imageBox.width * 2}px ${imageBox.height * 2}px`,
                      backgroundPosition: `${-zoomPos.x * 2 + 80}px ${-zoomPos.y * 2 + 80}px`,
                    }}
                  >
                    <Box
                      sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        bgcolor: "rgba(255,255,255,0.85)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Search fontSize="small" />
                    </Box>
                  </Box>
                )}
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1, flexWrap: "wrap", gap: 1 }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {product.title}
                  </Typography>
                  {product.sku && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      SKU: {product.sku}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <IconButton
                    onClick={handleFavorite}
                    disabled={!isLoggedIn}
                    sx={{
                      border: "1px solid #e0e0e0",
                      width: 48,
                      height: 48,
                      color: isFavorited ? "#EB5757" : "inherit",
                    }}
                  >
                    {isFavorited ? <Favorite /> : <FavoriteBorder />}
                  </IconButton>
                  <IconButton
                    onClick={handleShare}
                    sx={{
                      border: "1px solid #e0e0e0",
                      width: 48,
                      height: 48,
                    }}
                  >
                    <Share />
                  </IconButton>
                </Box>
              </Box>

              <Typography variant="h5" color="primary" sx={{ mb: 3 }}>
                R$ {product.price.toFixed(2).replace(".", ",")}
              </Typography>

              {hasSizes && (
                <>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Tamanho
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 3 }}>
                    {product.sizes.map((size: string) => (
                      <Button
                        key={size}
                        variant={selectedSize === size ? "contained" : "outlined"}
                        onClick={() => setSelectedSize(size)}
                        sx={{ minWidth: 50 }}
                      >
                        {size}
                      </Button>
                    ))}
                  </Box>
                </>
              )}

              <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 4, alignItems: "flex-start" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="body1">Quantidade:</Typography>
                  <IconButton onClick={() => setQuantity(Math.max(1, quantity - 1))} size="small">
                    <Typography variant="h6">-</Typography>
                  </IconButton>
                  <Typography variant="body1" sx={{ minWidth: 30, textAlign: "center" }}>{quantity}</Typography>
                  <IconButton onClick={() => setQuantity(quantity + 1)} size="small">
                    <Typography variant="h6">+</Typography>
                  </IconButton>
                </Box>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<ShoppingCart />}
                  onClick={handleAddToCart}
                  sx={{
                    py: 1,
                    px: 2,
                    textTransform: "none",
                    color: "#3483FA",
                    backgroundColor: "var(--andes-button-quiet-color-fill-default, var(--andes-color-blue-150, rgba(65, 137, 230, .15)))",
                    fontWeight: 600,
                    '&:hover': {
                      backgroundColor: "rgba(65, 137, 230, 0.25)",
                    },
                  }}
                >
                  Adicionar ao Carrinho
                </Button>
              </Box>

              <Box sx={{ display: "grid", gap: 1.5, mb: 3 }}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Características
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography whiteSpace="pre-line" color="text.secondary">
                      {product.characteristics}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Descrição
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography color="text.secondary">{product.description}</Typography>
                  </AccordionDetails>
                </Accordion>
              </Box>
            </Grid>
          </Grid>

          <Box sx={{ mt: 6 }}>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
              Produtos Semelhantes
            </Typography>
          <Grid container spacing={1}>
              {similarProducts.map((prod) => (
                <Grid item xs={12} sm={6} md={4} key={prod.id}>
                  <ProductCard product={prod} size="small" />
                </Grid>
              ))}
            </Grid>
          </Box>
        </div>
      ) : null}
    </Container>
  );
}