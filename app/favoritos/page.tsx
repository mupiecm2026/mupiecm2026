"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Box, Button, Card, CardContent, CardMedia, Container, Grid, Typography } from "@mui/material";
import { useAuth } from "../../context/AuthContext";
import { FavoriteProduct, getFavorites, removeFavorite } from "../../lib/utils/favorites";

export default function FavoritesPage() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);

  useEffect(() => {
    setFavorites(getFavorites());
  }, []);

  const handleRemove = (id: string | number) => {
    removeFavorite(id);
    setFavorites(getFavorites());
  };

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Typography variant="h4" gutterBottom>
          Favoritos
        </Typography>
        <Typography sx={{ mb: 3 }}>
          Você precisa estar logado para ver seus produtos favoritos. Use o botão de usuário no cabeçalho para entrar.
        </Typography>
        <Button component={Link} href="/" variant="contained">
          Voltar para a loja
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Typography variant="h4" gutterBottom sx={{pb: 4}}>
        Meus Favoritos
      </Typography>
      {favorites.length === 0 ? (
        <Box sx={{ mt: 4 }}>
          <Typography sx={{ mb: 2 }}>
            Nenhum produto favoritado ainda.
          </Typography>
          <Button component={Link} href="/" variant="contained">
            Ver produtos
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {favorites.map((product) => (
            <Grid item xs={12} sm={6} md={4} key={product.id}>
              <Card sx={{ maxWidth: 250, height: 350 }}>
                {product.image ? (
                  <CardMedia
                    component="img"
                    sx={{ height: 200, objectFit: "contain" }}
                    image={product.image}
                    alt={product.title}
                  />
                ) : null}
                <CardContent>
                  <Box sx={{height: 80, overflow: "hidden", }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {product.title}
                  </Typography>
                  <Typography sx={{ mb: 2 }}>
                    R$ {product.price.toFixed(2)}
                  </Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                    <Button
                      component={Link}
                      href={`/produto/${product.id}`}
                      variant="outlined"
                      size="small"
                      
                    >
                      Ver produto
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      color="error"
                      onClick={() => handleRemove(product.id)}
                      // fullWidth
                    >
                      Remover
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}
