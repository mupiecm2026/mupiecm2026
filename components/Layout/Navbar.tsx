"use client";
import React, { useState, useEffect } from "react";
import { AppBar, Toolbar, IconButton, Typography, Avatar, Badge, Box, Button, Drawer, List, ListItem, ListItemIcon, ListItemText, useMediaQuery, useTheme } from "@mui/material";
import { ShoppingCart, Brightness4, Brightness7, Menu, Favorite, Person } from "@mui/icons-material";
import { useThemeContext } from "../../context/Layout/ThemeContext";
import { useRouter } from "next/navigation";
import { useCart } from "../../context/Products/CartContext";
import { useAuth } from "../../context/Authentication/AuthContext";
import CartDrawer from "./CartDrawer";
import LoginModal from "../Auth/LoginModal";

export default function Navbar() {
  const { mode, toggleTheme } = useThemeContext();
  const navigate = useRouter();
  const { totalItems } = useCart();
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null; 
  // -----------------------------------------

  return (
    <>
      <AppBar 
        position="static" 
        elevation={0} 
        component="div"
        sx={{
          width: "100%",
          backgroundColor: "transparent",
          boxShadow: "none",
          border: "none",
          color: "var(--text-primary)",
          px: 2
        }}
      >
        <Toolbar sx={{ display: "flex",  width: "100%", justifyContent: "space-between" }}>
          
          {/* Logo no canto esquerdo */}
          <Typography
            onClick={() => navigate.push("/")}
            variant="h6"
            sx={{ 
              fontWeight: 700, 
              cursor: "pointer",
              // Removido o flexGrow: 1 daqui para ela não "esticar"
            }}
          >
            Mupi
          </Typography>

          {/* Esse Box vazio com flexGrow joga tudo que vem depois dele para a DIREITA */}
          {/* <Box sx={{ flexGrow: 1 }} /> */}

          {/* Ícones agrupados na direita */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <IconButton onClick={toggleTheme} color="inherit">
              {mode === "light" ? <Brightness7 /> : <Brightness4 />}
            </IconButton>

            {isMobile ? (
              <IconButton onClick={() => setMenuOpen(true)} color="inherit">
                <Menu />
              </IconButton>
            ) : (
              <>
                <IconButton color="inherit" onClick={() => setDrawerOpen(true)}>
                  <Badge badgeContent={totalItems} color="success">
                    <ShoppingCart />
                  </Badge>
                </IconButton>

                {user && (
                  <Button
                    color="inherit"
                    onClick={() => navigate.push("/favoritos")}
                    sx={{ textTransform: "none", fontWeight: 600 }}
                  >
                    Favoritos
                  </Button>
                )}

                <IconButton color="inherit" onClick={() => setLoginOpen(true)}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: user ? "secondary.main" : "grey.500" }}>
                    {user ? user.email.charAt(0).toUpperCase() : "?"}
                  </Avatar>
                </IconButton>
              </>
            )}
          </Box>
         
        </Toolbar>
      </AppBar>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      <CartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <Drawer anchor="right" open={menuOpen} onClose={() => setMenuOpen(false)}>
        <Box sx={{ width: 250, p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Menu</Typography>
          <List>
            <ListItem button onClick={() => { setLoginOpen(true); setMenuOpen(false); }}>
              <ListItemIcon>
                <Person />
              </ListItemIcon>
              <ListItemText primary={user ? "Perfil" : "Login"} />
            </ListItem>
            <ListItem button onClick={() => { setDrawerOpen(true); setMenuOpen(false); }}>
              <ListItemIcon>
                <Badge badgeContent={totalItems} color="success">
                  <ShoppingCart />
                </Badge>
              </ListItemIcon>
              <ListItemText primary="Carrinho" />
            </ListItem>
            {user && (
              <ListItem button onClick={() => { navigate.push("/favoritos"); setMenuOpen(false); }}>
                <ListItemIcon>
                  <Favorite />
                </ListItemIcon>
                <ListItemText primary="Favoritos" />
              </ListItem>
            )}
          </List>
        </Box>
      </Drawer>
    </>
  );
}