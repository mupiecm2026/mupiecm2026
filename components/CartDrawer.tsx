"use client";
import React from "react";
import {
  Drawer,
  Box,
  IconButton,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Button,
  Stack,
} from "@mui/material";
import { Add, Remove, Close } from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { useCart } from "../context/CartContext";

/**
 * Drawer do carrinho - mostra itens, controles de quantidade, total e botão Pagar Agora
 * Props:
 * - open: boolean - abre/fecha o drawer
 * - onClose: () => void - callback para fechar
 */
export default function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items, increase, decrease, removeItem, totalItems, totalPrice } = useCart();
  const router = useRouter();

  // ao clicar em Pagar Agora, fecha o drawer e navega para /checkout
  const handleCheckout = () => {
    onClose();
    router.push("/checkout");
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: { xs: 340, sm: 420 }, height: "100vh", display: "flex", flexDirection: "column", p: 2 }}>
        {/* Cabeçalho do drawer */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Meu Carrinho
          </Typography>
          <IconButton onClick={onClose} size="small" aria-label="Fechar carrinho">
            <Close />
          </IconButton>
        </Box>

        <Divider />

        {/* Lista de itens */}
        <Box sx={{ flex: 1, overflowY: "auto", mt: 1 }}>
          {items.length === 0 ? (
            <Box sx={{ py: 6, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Seu carrinho está vazio
              </Typography>
            </Box>
          ) : (
            <List>
              {items.map((it) => (
                <ListItem key={it.id} sx={{ alignItems: "flex-start", py: 2, borderBottom: (theme) => `2px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}` }}>
                  <ListItemAvatar>
                    <Avatar variant="rounded" src={it.image ?? undefined} sx={{ width: 64, height: 64 }} />
                  </ListItemAvatar>

                  <ListItemText
                    primary={
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {it.title}
                      </Typography>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                          R$ {it.price.toFixed(2).replace(".", ",")}
                        </Typography>

                        {/* controles de quantidade */}
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => decrease(it.id, 1)}
                            aria-label={`Diminuir ${it.title}`}
                          >
                            <Remove fontSize="small" />
                          </IconButton>

                          <Typography variant="body2" sx={{ minWidth: 22, textAlign: "center" }}>
                            {it.quantity}
                          </Typography>

                          <IconButton
                            size="small"
                            onClick={() => increase(it.id, 1)}
                            aria-label={`Aumentar ${it.title}`}
                          >
                            <Add fontSize="small" />
                          </IconButton>

                          <Button
                            size="small"
                            onClick={() => removeItem(it.id)}
                            sx={{ ml: 1, textTransform: "none" }}
                          >
                            Remover
                          </Button>
                        </Stack>
                      </>
                    }
                    secondaryTypographyProps={{ component: 'div' }}
                    sx={{ ml: 1 }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>

        <Divider sx={{ my: 1 }} />

        {/* Rodapé: total e botão pagar */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Box>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Total
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              R$ {totalPrice.toFixed(2).replace(".", ",")}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {totalItems} item{totalItems !== 1 ? "s" : ""}
            </Typography>
          </Box>

          <Button
            variant="contained"
            color="secondary"
            onClick={handleCheckout}
            disabled={items.length === 0}
            sx={{ borderRadius: 2, px: 3, color: "#F5F5DC", fontWeight: 600 }}
          >
            Pagar Agora
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}