// src/app/cashback/page.tsx
"use client";
import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
  Stack,
  Grid,
  Tooltip,
  Snackbar,
  Alert,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CalculateIcon from "@mui/icons-material/Calculate";
import PaidIcon from "@mui/icons-material/Paid";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";

export default function CashbackPage() {
  const [codes, setCodes] = useState<string[]>([]);
  const [pixKey, setPixKey] = useState("");
  const [modal, setModal] = useState<{ open: boolean; data?: any }>({ open: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");

  const [savedMsgOpen, setSavedMsgOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Opcional: restaurar PIX salvo localmente ao abrir a página
  useEffect(() => {
    const persisted = typeof window !== "undefined" ? localStorage.getItem("cashback:pixKey") : null;
    if (persisted) setPixKey(persisted);
  }, []);

  const formatBRL = (cents?: number) =>
    "R$ " + ((cents ?? 0) / 100).toFixed(2).replace(".", ",");

  const addCurrentInput = () => {
    const raw = inputRef.current?.value ?? inputValue;
    const value = (raw || "").trim();
    if (!value) return;
    if (!codes.includes(value)) setCodes((prev) => [...prev, value]);
    if (inputRef.current) inputRef.current.value = "";
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ([" ", "Enter"].includes(e.key)) {
      e.preventDefault();
      addCurrentInput();
    }
  };

  const removeCode = (code: string) => setCodes((prev) => prev.filter((c) => c !== code));

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // silencioso para UX clean
    }
  };

  const verifyCodes = async () => {
    if (!codes.length) return setError("Adicione pelo menos um código.");
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/cashback/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes }),
      });
      const json : any = await res.json();
      if (!res.ok) return setError(json.error || "Erro ao verificar códigos.");
      setModal({ open: true, data: json });
    } catch (err: any) {
      setError(String(err?.message ?? err));
    } finally {
      setLoading(false);
    }
  };

  const submitCashback = async () => {
    if (!pixKey) return setError("Informe a chave PIX.");
    if (!codes.length) return setError("Nenhum código informado.");
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/cashback/cashout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes, pixKey }),
      });
      const json : any = await res.json();
      if (!res.ok) return setError(json.error || "Erro ao efetuar cashback.");
      // feedback leve: snackbar ou abrir modal com resumo
      setSavedMsgOpen(true);
      setCodes([]);
      // não limpar pixKey após cashout, para reuso
    } catch (err: any) {
      setError(String(err?.message ?? err));
    } finally {
      setLoading(false);
    }
  };

  // Salvar chave PIX localmente (sem ler config ativa)
  // const savePixKey = () => {
  //   if (!pixKey || pixKey.trim().length === 0) {
  //     setError("Informe uma chave PIX válida para salvar.");
  //     return;
  //   }
  //   try {
  //     localStorage.setItem("cashback:pixKey", pixKey.trim());
  //     setSavedMsgOpen(true);
  //   } catch {
  //     setError("Falha ao salvar a chave PIX localmente.");
  //   }
  // };

  const missingCodes = useMemo(() => modal.data?.missing ?? [], [modal]);
  const statusColor = (code: string) => (missingCodes.includes(code) ? "error" : "success");

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        background: "var(--bg)",
        p: { xs: 2, md: 4 },
      }}
    >
      <Paper
        elevation={8}
        sx={{
          width: "100%",
          maxWidth: 960,
          p: { xs: 3, md: 4 },
          borderRadius: 3,
          background: "var(--paper)",
          border: "1px solid var(--border)",
        }}
      >
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight={800}>
            Cashback
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            Informe seus códigos e transfira via PIX em poucos passos.
          </Typography>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
            Códigos
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", mb: 2, display: "block" }}>
            Use Enter ou espaço para adicionar. Você pode colar uma lista e ir confirmando.
          </Typography>

          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={9}>
              <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={codes}
                inputValue={inputValue}
                onInputChange={(_, v) => setInputValue(v)}
                onChange={(_, v) => setCodes(v as string[])}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Ex.: #X9A1, #B7F3, #J2M0"
                    onKeyDown={handleKeyDown}
                    inputRef={(el) => {
                      inputRef.current = el;
                      const refAny = params.inputProps?.ref as any;
                      if (typeof refAny === "function") refAny(el);
                      else if (refAny && typeof refAny === "object") refAny.current = el;
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": { borderRadius: 2 },
                    }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                startIcon={<AddIcon />}
                onMouseDown={(e) => {
                  e.preventDefault(); // captura antes do blur
                  addCurrentInput();
                }}
                sx={{ borderRadius: 2, fontWeight: 700 }}
              >
                Adicionar
              </Button>
            </Grid>
          </Grid>

          {codes.length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap" mt={2}>
              {codes.map((code) => (
                <Chip
                  key={code}
                  label={code}
                  color={statusColor(code)}
                  variant="outlined"
                  onDelete={() => removeCode(code)}
                  sx={{ mr: 1, mb: 1, borderRadius: 1.5 }}
                  icon={
                    statusColor(code) === "success" ? (
                      <CheckCircleOutlineIcon fontSize="small" />
                    ) : (
                      <ErrorOutlineIcon fontSize="small" />
                    )
                  }
                />
              ))}
            </Stack>
          )}
        </Box>

        {error && (
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              mb: 2,
              borderColor: "error.light",
              background: "rgba(244, 67, 54, 0.06)",
              borderRadius: 2,
            }}
          >
            <Typography color="error" fontWeight={600}>
              {error}
            </Typography>
          </Paper>
        )}

        <Grid container spacing={2} sx={{ mb: 4 }} alignItems="center">
          <Grid item xs={12} md={8}>
            <TextField
              label="Chave PIX para transferência"
              fullWidth
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: 2 },
              }}
              placeholder="E-mail, telefone, CPF/CNPJ ou chave aleatória"
            />
          </Grid>
          {/* <Grid item xs={12} md={4}>
            <Button
              variant="outlined"
              fullWidth
              size="large"
              startIcon={<SaveIcon />}
              onClick={savePixKey}
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >
              Salvar chave PIX
            </Button>
          </Grid> */}
        </Grid>

        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Button
              variant="contained"
              color="secondary"
              fullWidth
              size="large"
              startIcon={<CalculateIcon />}
              disabled={loading}
              onClick={verifyCodes}
              sx={{
                py: 1.6,
                borderRadius: 2,
                fontWeight: 800,
                letterSpacing: 0.3,
              }}
            >
              {loading ? "Verificando..." : "Verificar e calcular"}
            </Button>
          </Grid>
          <Grid item xs={12} md={6}>
            <Button
              variant="contained"
              color="success"
              fullWidth
              size="large"
              startIcon={<PaidIcon />}
              disabled={loading}
              onClick={submitCashback}
              sx={{
                py: 1.8,
                borderRadius: 2,
                fontWeight: 800,
                letterSpacing: 0.3,
              }}
            >
              Efetuar cashback
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Dialog open={modal.open} onClose={() => setModal({ open: false })} maxWidth="md" fullWidth>
        <DialogTitle>Resumo do cashback</DialogTitle>
        <DialogContent>
          {!modal.data ? (
            <Typography>Carregando...</Typography>
          ) : (
            <Grid container spacing={2}>
              <Grid item xs={12} md={7}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: "text.secondary" }}>
                    Códigos enviados
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {codes.map((code) => (
                      <Chip
                        key={code}
                        label={code}
                        color={statusColor(code)}
                        variant="outlined"
                        sx={{ borderRadius: 1.5 }}
                        icon={
                          statusColor(code) === "success" ? (
                            <CheckCircleOutlineIcon fontSize="small" />
                          ) : (
                            <ErrorOutlineIcon fontSize="small" />
                          )
                        }
                      />
                    ))}
                  </Stack>

                  {modal.data.missing?.length > 0 && (
                    <Typography color="warning.main" sx={{ mt: 2 }}>
                      Não encontrados: {modal.data.missing.join(", ")}
                    </Typography>
                  )}

                  <Divider sx={{ my: 2 }} />

                  <List dense>
                    {Object.entries(modal.data.byGateway || {}).map(([gw, group]: any) => (
                      <Box key={gw} mb={1.5}>
                        <Typography fontWeight={700} textTransform="uppercase">
                          {gw}
                        </Typography>
                        <List disablePadding>
                          {group.entries.map((entry: any) => (
                            <ListItem key={entry.code} sx={{ py: 0.5 }}>
                              <ListItemText
                                primary={entry.code}
                                secondary={`Valor: ${formatBRL(entry.amount)} • transactionId: ${entry.transactionId}`}
                              />
                              <Tooltip title="Copiar código">
                                <Button
                                  size="small"
                                  startIcon={<ContentCopyIcon />}
                                  onClick={() => copyToClipboard(entry.code)}
                                >
                                  Copiar
                                </Button>
                              </Tooltip>
                            </ListItem>
                          ))}
                        </List>
                        <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
                          Subtotal {gw}: <strong>{formatBRL(group.total)}</strong>
                        </Typography>
                      </Box>
                    ))}
                  </List>
                </Paper>
              </Grid>

              <Grid item xs={12} md={5}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    background:
                      "linear-gradient(180deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.02) 100%)",
                  }}
                >
                  <Typography variant="subtitle2" sx={{ mb: 1, color: "text.secondary" }}>
                    Total elegível
                  </Typography>
                  <Typography variant="h4" fontWeight={800}>
                    {formatBRL(modal.data.total)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Valores podem variar conforme regras de cada gateway.
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button variant="outlined" onClick={() => setModal({ open: false })}>
            Fechar
          </Button>
          <Button variant="contained" onClick={() => setModal({ open: false })}>
            Continuar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={savedMsgOpen}
        autoHideDuration={2500}
        onClose={() => setSavedMsgOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setSavedMsgOpen(false)} severity="success" sx={{ width: "100%" }}>
          Operação realizada com sucesso.
        </Alert>
      </Snackbar>
    </Box>
  );
}