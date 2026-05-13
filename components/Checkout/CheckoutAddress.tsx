// src/components/Checkout/CheckoutAddress.tsx
"use client";
import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  InputAdornment
} from "@mui/material";
import { Person, LocationOn, Home, Numbers, Email, Badge, PhoneAndroid } from "@mui/icons-material";

export default function CheckoutAddress({ onNext, initialData }: { onNext: (data: any) => void; initialData?: { name?: string; email?: string; cpf?: string; cep?: string; street?: string; number?: string; complement?: string; phone?: string } }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    cpf: "",
    cep: "",
    street: "",
    number: "",
    complement: "",
    phone: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const STORAGE_KEY = "mupi_checkout_address_v1";

  const maskCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 11);
    return numbers
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const maskPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 11);
    if (numbers.length <= 10) {
      return numbers
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }
    return numbers
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setForm(JSON.parse(saved));
        return;
      }
    } catch {
      // ignore
    }
    if (initialData) {
      setForm((state) => ({ ...state, ...initialData }));
    }
  }, [initialData]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  }, [form]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value: rawValue } = e.target;
    let value = rawValue;

    if (name === "cpf") {
      value = maskCPF(rawValue);
    }
    if (name === "phone") {
      value = maskPhone(rawValue);
    }

    setForm({ ...form, [name]: value });
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const continueHandler = () => {
    const nextErrors: Record<string, string> = {};
    const requiredFields = ["name", "email", "cpf", "cep", "street", "number", "phone"];

    requiredFields.forEach((field) => {
      const value = form[field as keyof typeof form]?.trim();
      if (!value) {
        nextErrors[field] = "Campo obrigatório";
      }
    });

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = "Email inválido";
    }

    if (form.cpf && form.cpf.replace(/\D/g, "").length < 11) {
      nextErrors.cpf = "CPF incompleto";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      const notify = (window as any).__notify;
      notify?.toast("Revise os campos obrigatórios", "warning");
      return;
    }

    onNext(form); // entrega todos os dados para o próximo passo
  };

  return (
    <Box
      sx={{
        width: "100%",      
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
        marginRight: {md: "40px"},
        backgroundColor: "background.default",
        px: 2,
        pt: { xs: 4, md: 2 }
      }}
    >
      <Paper
        elevation={6}
        sx={{
          width: "100%",
          maxWidth: 640,
          borderRadius: 4,
          p: 3,
          bgcolor: "background.paper",
          color: "text.primary",
          display: "flex",
          flexDirection: "column",
          gap: 2.5,
          border: "1px solid var(--border)",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, textAlign: "center" }}>
          Endereço de Entrega
        </Typography>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
          <TextField
            fullWidth
            label="Nome"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Seu nome completo"
            error={!!errors.name}
            helperText={errors.name}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Person />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="seuemail@exemplo.com"
            error={!!errors.email}
            helperText={errors.email}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Email />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            label="CPF"
            name="cpf"
            value={form.cpf}
            onChange={handleChange}
            placeholder="000.000.000-00"
            inputProps={{ maxLength: 14 }}
            error={!!errors.cpf}
            helperText={errors.cpf}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Badge />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            label="CEP"
            name="cep"
            value={form.cep}
            onChange={handleChange}
            placeholder="00000-000"
            error={!!errors.cep}
            helperText={errors.cep}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LocationOn />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            label="Rua"
            name="street"
            value={form.street}
            onChange={handleChange}
            placeholder="Nome da rua / avenida"
            error={!!errors.street}
            helperText={errors.street}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Home />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            label="Telefone"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="(11) 91234-5678"
            inputProps={{ maxLength: 15 }}
            error={!!errors.phone}
            helperText={errors.phone}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PhoneAndroid />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "160px 1fr" }, gap: 2 }}>
          <TextField
            fullWidth
            label="Número"
            name="number"
            value={form.number}
            onChange={handleChange}
            placeholder="123"
            error={!!errors.number}
            helperText={errors.number}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Numbers />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            fullWidth
            label="Complemento (opcional)"
            name="complement"
            value={form.complement}
            onChange={handleChange}
            placeholder="Apto, bloco, referência"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Home />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="contained"
            color="primary"
            onClick={continueHandler}
            sx={{ borderRadius: 2, px: 3 }}
          >
            Continuar
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
