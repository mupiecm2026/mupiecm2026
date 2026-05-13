"use client";

import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  TextField,
  Typography,
  Paper,
  Avatar,
} from "@mui/material";
import { Email, Lock, Person, Visibility, VisibilityOff, Business } from "@mui/icons-material";
import { useAuth } from "../../context/AuthContext";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function LoginModal({ open, onClose }: Props) {
  const auth = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleToggleMode = () => {
    setError(null);
    setMode((current) => (current === "login" ? "register" : "login"));
  };

  const handleSubmit = async () => {
    setError(null);
    if (!email || !password) {
      setError("Preencha email e senha.");
      return;
    }
    if (mode === "register" && password !== confirmPassword) {
      setError("As senhas precisam ser iguais.");
      return;
    }

    try {
      setLoading(true);
      if (mode === "register") {
        await auth.register(email, password);
      } else {
        await auth.login(email, password);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || "Erro ao autenticar.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleLogout = async () => {
    await auth.logout();
    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth={false} PaperProps={{ sx: { borderRadius: 3, maxWidth: 420 } }}>
      <DialogTitle sx={{ textAlign: "center", pb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mb: 1 }}>
          <Business sx={{ mr: 1, color: "primary.main" }} />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Mupi
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {auth.user ? "Sua conta" : mode === "login" ? "Entre na sua conta" : "Crie sua conta"}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ px: 4, pb: 2 }}>
        {auth.user ? (
          <Paper elevation={2} sx={{ p: 3, textAlign: "center", borderRadius: 2 }}>
            <Avatar sx={{ width: 64, height: 64, mx: "auto", mb: 2, bgcolor: "secondary.main" }}>
              {auth.user.email.charAt(0).toUpperCase()}
            </Avatar>
            <Typography sx={{ mb: 1, fontWeight: 600 }}>Olá, {auth.user.email.split("@")[0]}!</Typography>
            <Typography sx={{ color: "text.secondary" }}>
              Você está conectado. Use o botão abaixo para sair da conta.
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              fullWidth
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <TextField
              label="Senha"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              fullWidth
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            {mode === "register" && (
              <TextField
                label="Confirmar senha"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                fullWidth
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            )}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {mode === "login"
                  ? "Não tem conta ainda?"
                  : "Já tem conta?"}
              </Typography>
              <Button variant="text" onClick={handleToggleMode} sx={{ textTransform: "none" }}>
                {mode === "login" ? "Criar conta" : "Entrar"}
              </Button>
            </Box>
            <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center" }}>
              <a href="#" style={{ color: "inherit", textDecoration: "underline" }}>
                Esqueceu a senha?
              </a>
            </Typography>
          </Stack>
        )}
        {error && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 4, pb: 3, justifyContent: "center" }}>
        {auth.user ? (
          <Button onClick={handleLogout} variant="outlined" color="error" sx={{ borderRadius: 2, px: 4 }}>
            Sair da conta
          </Button>
        ) : (
          <Button onClick={handleSubmit} variant="contained" color="primary" disabled={loading} sx={{ borderRadius: 2, px: 4, minWidth: 120 }}>
            {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
