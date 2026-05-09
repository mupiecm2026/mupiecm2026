// src\components\Checkout\CheckoutPaymentForm.tsx
"use client";
import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  InputAdornment,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { CreditCard, Person, CalendarMonth, Lock, Security } from "@mui/icons-material";
import Image from "next/image";

import mpIcon from "../../public/mp.png";
import stripeIcon from "../../public/stripe.png";
import pagarmeIcon from "../../public/pagarme.png";
import cieloIcon from "../../public/cielo.jpeg";
import { useCart } from "../../context/CartContext";
import { GatewayNames } from "../../types/types";
import { tokenizeCard } from "../../lib/utils/card-tokenizer";
import { collectAllFingerprints, DeviceFingerprints } from "../../lib/utils/fingerprint-collector";
import { logger } from "../../lib/utils/logger";

interface Props {
  gateway: GatewayNames;
  gatewayConfigs?: Partial<Record<GatewayNames, any> | any>;
  onGatewayChange?: (g: GatewayNames) => void;
  onBack: () => void;
  onPay: (paymentPayload: any) => Promise<void> | void;
  userData?: {
    name: string;
    email: string;
    cpf?: string;
    phone?: string;
    complement?: string;
  };
}

const GATEWAYS: { key: GatewayNames; label: string; logo: any }[] = [
  { key: "mercadopago", label: "Mercado Pago", logo: mpIcon },
  { key: "cielo", label: "Cielo", logo: cieloIcon },
  { key: "pagarme", label: "Pagar-me", logo: pagarmeIcon },
  { key: "stripe", label: "Stripe", logo: stripeIcon },
];

export default function CheckoutPaymentForm({
  gateway,
  gatewayConfigs = {},
  onGatewayChange,
  onBack,
  onPay,
  userData = { name: "", email: "", cpf: "" },
}: Props) {
  const [selectedGateway, setSelectedGateway] = useState<GatewayNames>(gateway);
  const [card, setCard] = useState({ name: "", number: "", exp: "", cvv: "" });
  const [installments, setInstallments] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fingerprints, setFingerprints] = useState<DeviceFingerprints>({});
  const [fingerprintError, setFingerprintError] = useState<string | null>(null);
  const [checkoutReady, setCheckoutReady] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const STORAGE_KEY = "mupi_checkout_payment_v1";

  const { items, totalItems, totalPrice } = useCart();
  const shipping = 0;
  const grandTotal = totalPrice + shipping;

  const getActiveGatewayConfig = (g: GatewayNames) => {
    const raw = gatewayConfigs ?? {};
    const provider = raw?.gateways?.[g];
    return provider?.configs?.find((config: any) => config.status === 'ativo')?.creds ?? {};
  };

  useEffect(() => {
    setSelectedGateway(gateway);
    setCard({ name: "", number: "", exp: "", cvv: "" });
  }, [gateway]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (parsed.card) setCard(parsed.card);
      if (parsed.installments) setInstallments(parsed.installments);
      if (parsed.selectedGateway) setSelectedGateway(parsed.selectedGateway);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ card, installments, selectedGateway }));
  }, [card, installments, selectedGateway]);

  // Coleta fingerprints quando o componente monta
  useEffect(() => {
    const initializeFingerprints = async () => {
      try {
        setFingerprintError(null);
        const fps = await collectAllFingerprints({
          mercadopagoPublicKey: getActiveGatewayConfig("mercadopago")?.public_key || getActiveGatewayConfig("mercadopago")?.publishable_key,
          stripePublicKey: getActiveGatewayConfig("stripe")?.publishable_key || getActiveGatewayConfig("stripe")?.public_key,
          pagarmePublicKey: getActiveGatewayConfig("pagarme")?.public_key,
          adiqPublicKey: getActiveGatewayConfig("adyen")?.public_key || getActiveGatewayConfig("adyen")?.publishable_key,
          threatmetrixOrgId: process.env.NEXT_PUBLIC_THREATMETRIX_ORG_ID,
        });
        logger.info("Fingerprints coletados", { count: Object.keys(fps).length });
        setFingerprints(fps);
      } catch (err: any) {
        console.warn("Falha ao coletar fingerprints:", err);
        setFingerprintError(err?.message ?? "Erro desconhecido");
      }
    };

    initializeFingerprints();

    const timer = window.setTimeout(() => setCheckoutReady(true), 3000);
    return () => window.clearTimeout(timer);
  }, [gatewayConfigs]);

  // ===========================================
  // MÁSCARAS
  // ===========================================
  const maskCardNumber = (raw: string) => raw.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
  const maskExp = (raw: string) => {
    let v = raw.replace(/\D/g, "").slice(0, 4);
    if (v.length >= 3) v = v.replace(/^(\d{2})(\d{1,2})$/, "$1/$2");
    return v;
  };
  const maskCvv = (raw: string) => raw.replace(/\D/g, "").slice(0, 4);
  const maskName = (raw: string) => raw.replace(/[^A-Za-zÀ-ÿ\s]/g, "");

  const getGatewayDeviceId = (): string | undefined => {
    const gatewayFingerprints = fingerprints || {};

    switch (selectedGateway) {
      case "mercadopago":
        return gatewayFingerprints.mercadopago?.deviceId;
      case "cielo":
        return gatewayFingerprints.cielo?.dfpSessionId;
      case "pagarme":
        return gatewayFingerprints.pagarme?.deviceId;
      case "adyen":
        return gatewayFingerprints.adiq?.fingerprintId;
      case "stripe":
        return gatewayFingerprints.stripe?.fingerprintToken;
      default:
        return (
          gatewayFingerprints.pagarme?.deviceId ||
          gatewayFingerprints.mercadopago?.deviceId ||
          gatewayFingerprints.cielo?.dfpSessionId ||
          gatewayFingerprints.adiq?.fingerprintId ||
          gatewayFingerprints.stripe?.fingerprintToken
        );
    }
  };

  const handleChange = (field: string, value: string) => {
    if (field === "number") value = maskCardNumber(value);
    if (field === "exp") value = maskExp(value);
    if (field === "cvv") value = maskCvv(value);
    if (field === "name") value = maskName(value);
    setCard((c) => ({ ...c, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const submit = async () => {
    const notify = (window as any).__notify;
    if (!checkoutReady) {
      notify?.toast("Aguarde alguns segundos enquanto validamos o pagamento.", "warning");
      return;
    }

    const cardNumber = card.number.replace(/\s/g, "");
    const validCardNumber = cardNumber.length >= 12;
    const validCvv = /^\d{3,4}$/.test(card.cvv);
    const validExp = /^\d{2}\/\d{2}$/.test(card.exp);

    const nextErrors: Record<string, string> = {};
    if (!userData?.email) nextErrors.email = "Email obrigatório";
    if (!userData?.cpf) nextErrors.cpf = "CPF obrigatório";
    if (!userData?.phone) nextErrors.phone = "Telefone obrigatório";
    if (!card.name) nextErrors.name = "Nome do titular obrigatório";
    if (!card.number) nextErrors.number = "Número do cartão obrigatório";
    if (!card.exp) nextErrors.exp = "Validade obrigatória";
    if (!card.cvv) nextErrors.cvv = "CVV obrigatório";

    if (!validCardNumber) nextErrors.number = "Número do cartão inválido";
    if (!validExp) nextErrors.exp = "Validade inválida";
    if (!validCvv) nextErrors.cvv = "CVV inválido";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      notify?.toast("Revise os campos em destaque", "warning");
      return;
    }

    if (!userData?.email || !userData?.cpf || !userData?.phone || !card.name || !card.number || !card.exp || !card.cvv) {
      notify?.toast("Preencha todos os campos obrigatórios", "warning");
      return;
    }

    if (!validCardNumber || !validCvv || !validExp) {
      notify?.toast("Dados do cartão inválidos", "warning");
      return;
    }

    setLoading(true);
    try {
      const activeCfg = getActiveGatewayConfig(selectedGateway);

      // Payload base que serve para qualquer gateway
      const basePayload = {
        amount: Math.round(grandTotal * 100),
        installments,
        payer: {
          email: userData.email,
          cpf: userData.cpf,
          name: userData.name,
        },
        cardholderName: card.name || userData.name,
        deviceId: getGatewayDeviceId(),
      };

      // Tokeniza o cartão conforme o gateway
      const tokenResult = await tokenizeCard(selectedGateway, card, activeCfg);

      // Envia para o backend
      await onPay({
        ...basePayload,
        token: tokenResult.token,
        paymentMethodId: tokenResult.paymentMethodId || "",
        cardData: {
          number: card.number.replace(/\s/g, ""),
          holder: card.name,
          expMonth: card.exp.replace(/\D/g, "").slice(0, 2),
          expYear: `20${card.exp.replace(/\D/g, "").slice(2, 4)}`,
          cvv: card.cvv,
          cpf: userData.cpf,
          email: userData.email,
        },
        // Add device fingerprints for anti-fraud
        deviceFingerprints: fingerprints,
        metadata: {
          complement: userData.complement,
          phone: userData.phone,
        },
      });
    } catch (err: any) {
      console.error("Erro no submit:", err);
      notify?.toast(err.message || "Erro ao processar pagamento", "error");
    } finally {
      setLoading(false);
    }
  };
          
  const handleGatewayToggle = (val: GatewayNames | null) => {
      if (!val) return;
      setSelectedGateway(val);
      setCard({ name: "", number: "", exp: "", cvv: "" });
      if (onGatewayChange) onGatewayChange(val);
  };

  return (
      <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        width: "100%",           
        backgroundColor: "background.default",
        px: { xs: 2, sm: 0 },
        pt: { xs: 3, md: 2 },
        pb: { xs: 4, md: 0 },
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 1000,
          mx: "auto",            
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 360px" },
          gap: 3,
          boxSizing: "border-box",
          justifyContent: "center",
        }}
      >
        {/* Paper de Pagamento */}
        <Paper
          elevation={6}
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 4,
            bgcolor: "background.paper",
            color: "text.primary",
            display: "flex",
            flexDirection: "column",
            gap: 2.5,
            border: "1px solid var(--border)",
            overflow: { xs: "hidden", md: "visible" },
            boxSizing: "border-box",
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Pagamento
          </Typography>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              mt: -2,
              flexWrap: "wrap",
              width: "450px", 
            }}
          >
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Selecione o gateway
            </Typography>

          <ToggleButtonGroup
            value={selectedGateway}
            exclusive
            onChange={(_, v) => handleGatewayToggle(v as GatewayNames)}
            sx={{
              display: "flex", 
              flexWrap: "wrap", 
              gap: 1,
              width: "100%",
              "& .MuiToggleButton-root": {
                flex: 1, 
                minWidth: "120px", 
                height: "50px",
                borderRadius: "8px !important",
                border: "1px solid #ddd !important",
              },
            }}
          >
            {GATEWAYS.map((g) => (
              <ToggleButton key={g.key} value={g.key}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Image 
                    src={g.logo} 
                    alt={g.label} 
                    width={24} 
                    height={24} 
                    style={{ objectFit: 'contain' }} 
                  />
                  <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
                    {g.label.split(' ')[0]} {/* Pega só o primeiro nome se for muito longo */}
                  </Typography>
                </Box>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

            <Box sx={{ ml: 2 }}>
              {/* <Chip label={`Modo: ${String(currentMode)}`} size="small" /> */}
            </Box>
          </Box>

          <Box
            sx={{
              position: "relative",
              borderRadius: 4,
              p: 2,
              pb: { xs: 6, sm: 5, md: 4 },
              overflow: "visible",
              bgcolor: "background.default",
              border: "1px solid var(--border)",
              boxSizing: "border-box",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                top: 16,
                left: 0,
                right: 0,
                height: 40,
                background: "var(--text-primary)",
                opacity: 0.15,
                display: { xs: "none", md: "block" }, // overlay também escondido em mobile
              }}
            />

            {/* faixa cinza: exibida apenas em md+ para não incomodar em mobile */}
            <Box
              sx={{
                position: "absolute",
                top: { md: 225 },
                right: 16,
                left: 16,
                height: 50,
                background: "rgba(255,255,255,0.08)",
                backdropFilter: "blur(0.2px)",
                WebkitBackdropFilter: "blur(0.2px)",
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.2)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                pointerEvents: "none",
                display: { xs: "none", sm: "none", md: "block" },
              }}
            />

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "2fr 1fr" },
                gap: { xs: 2, md: 1.5 },
                mt: { xs: 3.5, sm: 5, md: 8 },
              }}
            >
              <TextField
                label="Número do cartão"
                value={card.number}
                onChange={(e) => handleChange("number", e.target.value)}
                fullWidth
                placeholder="0000 0000 0000 0000"
                error={!!errors.number}
                helperText={errors.number}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CreditCard />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="CVV"
                value={card.cvv}
                onChange={(e) => handleChange("cvv", e.target.value)}
                placeholder="123"
                fullWidth
                error={!!errors.cvv}
                helperText={errors.cvv}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "2fr 1fr" },
                  gap: { xs: 2, md: 1.5 },
                  mt: 1.5,
                }}
              >
              <TextField
                label="Nome no cartão"
                value={card.name}
                onChange={(e) => handleChange("name", e.target.value)}
                fullWidth
                placeholder="NOME COMPLETO"
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
                label="Validade (MM/AA)"
                value={card.exp}
                onChange={(e) => handleChange("exp", e.target.value)}
                fullWidth
                placeholder="MM/AA"
                error={!!errors.exp}
                helperText={errors.exp}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarMonth />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Box
              sx={{
                position: "relative",
                zIndex: 2,
                mt: { xs: 3, md: 4 },
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  textAlign: "center",
                  maxWidth: 260,
                  width: "100%",
                  lineHeight: 1.2,
                }}
              >
                Seus dados são criptografados e nunca armazenamos o número do seu cartão.
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 0.75,
              alignItems: "center",
              mb: 1,
            }}
          >
            <Chip
              icon={<Security />}
              label="Transação protegida por SSL 256-bit"
              color="success"
              sx={{ borderRadius: 2, fontWeight: 600 }}
            />
          </Box>
        </Paper>

        <Paper
          elevation={6}
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 4,
            bgcolor: "background.paper",
            color: "text.primary",
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            border: "1px solid var(--border)",
            boxSizing: "border-box",
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Resumo
          </Typography>

          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel id="installment-label">Parcelas</InputLabel>
            <Select
              labelId="installment-label"
              value={installments}
              label="Parcelas"
              onChange={(event) => setInstallments(Number(event.target.value))}
              sx={{ borderRadius: 2 }}
            >
              {[1, 2, 3, 4, 6, 8, 10, 12].map((option) => (
                <MenuItem key={option} value={option}>
                  {option}x sem juros
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Subtotal
            </Typography>
            <Typography variant="body2">
              R$ {totalPrice.toFixed(2).replace(".", ",")}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Frete
            </Typography>
            <Typography variant="body2">
              R$ {shipping.toFixed(2).replace(".", ",")}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5, pt: 1, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Total</Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#2196f3" }}>
              R$ {grandTotal.toFixed(2).replace(".", ",")}
            </Typography>
          </Box>

          <Typography variant="caption" sx={{ color: "text.secondary", mt: 2 }}>
            {totalItems} item{totalItems !== 1 ? "s" : ""} no carrinho
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", mt: 2 }}>
            Seus dados são criptografados e nunca compartilhados com o comerciante.
          </Typography>

          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, mt: 3, flexWrap: "wrap" }}>
            <Button variant="outlined" onClick={onBack} sx={{ borderRadius: 2, flex: 1, maxWidth: 120 }}>
              Voltar
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={submit}
              disabled={!checkoutReady || loading}
              sx={{
                borderRadius: 2,
                px: 3,
                fontWeight: 600,
                color: "#F5F5DC",
                flex: 1,
                maxWidth: 150,
              }}
            >
              {loading ? "Processando..." : "Pagar Agora"}
            </Button>
          </Box>
          {!checkoutReady && (
            <Typography variant="caption" sx={{ color: "warning.main", mt: 1, textAlign: "center" }}>
              Aguarde alguns segundos enquanto validamos as condições de segurança.
            </Typography>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
