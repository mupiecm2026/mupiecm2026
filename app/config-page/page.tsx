 // mupi\app\config\page.tsx
"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  TextField,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  Container,
  Stack,
  Divider,
  IconButton,
  InputAdornment,
  CircularProgress,
  Snackbar,
  Alert,
  Tooltip,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from "@mui/material";
import PaymentIcon from "@mui/icons-material/Payment";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import BlockIcon from "@mui/icons-material/Block";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

type GatewayId =
  | "mercadopago"
  | "pagarme"
  | "cielo"
  | "stripe"
  | "getnet"
  | "adyen"
  | "sumup";

type PspId = "efipay" | "mercadopago";

const fieldsByGateway: Record<GatewayId, string[]> = {
  mercadopago: ["access_token", "public_key"],
  pagarme: ["api_key", "encryption_key"],
  cielo: ["merchant_id", "merchant_key"],
  stripe: ["secret_key", "publishable_key"],
  getnet: ["client_id", "client_secret"],
  adyen: ["api_key", "merchant_account"],
  sumup: ["client_id", "client_secret"],
};

const fieldsByPsp: Record<PspId, string[]> = {
  efipay: ["client_id", "client_secret", "certificate", "certificate_key"],
  mercadopago: ["access_token"],
};

const gatewaysWithTest: Record<GatewayId, boolean> = {
  mercadopago: true,
  stripe: true,
  pagarme: true,
  cielo: true,
  adyen: true,
  getnet: false,
  sumup: false,
};

type Creds = Record<string, string>;
type GatewayConfigItem = {
  id: string;
  status: "ativo" | "bloqueado" | "inativo";
  mode?: "test" | "production";
  creds?: Creds;
};
type GwStoreItem = { type?: "gateway" | "psp"; configs?: GatewayConfigItem[] };
type PspConfig = { creds?: Creds; configs?: GatewayConfigItem[] };
type Store = {
  gateways?: Partial<Record<GatewayId, GwStoreItem>>;
  psps?: Partial<Record<PspId, PspConfig>>;
  // allow top-level type when backend writes it
  type?: "gateway" | "psp";
};

function normalizeStore(raw: any): Store {
  if (!raw) return { gateways: {}, psps: {} };

  const data = raw.store ?? raw;

  return {
    gateways: data?.gateways ?? {},
    psps: data?.psps ?? {},
  };
}

export default function Page() {
  const applyStore = (payload: any) => {
  const normalized = normalizeStore(payload?.store ?? payload);
  setStore(normalized);
};

  const [modeType, setModeType] = useState<"gateway" | "psp">("gateway");
  const [selectedGw, setSelectedGw] = useState<GatewayId>("mercadopago");
  const [selectedPsp, setSelectedPsp] = useState<PspId>("efipay");

  const [store, setStore] = useState<Store | null>(null);
  const [mode, setMode] = useState<"test" | "production">("production");
  const [creds, setCreds] = useState<Creds>({});
  const [loading, setLoading] = useState(false);

  const [snack, setSnack] = useState<{ open: boolean; severity: "success" | "error" | "info"; message: string }>({
    open: false,
    severity: "info",
    message: "",
  });

  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});
  const [openAdvanced, setOpenAdvanced] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [confirmActivateOpen, setConfirmActivateOpen] = useState(false);
  const [pendingActivate, setPendingActivate] = useState<{ kind: "gateway" | "psp"; key: string; id: string } | null>(null);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ kind: "gateway" | "psp"; key: string; id: string } | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      try {
        const res : any = await fetch("/api/vault");
        const data = await res.json();

        if (!res.ok || !data?.success) throw new Error("Erro ao carregar");

        const normalized = normalizeStore(data?.store ?? data);

        if (!alive) return;

        setStore(normalized);

        // seleção inicial segura (SEM depender de render anterior)
        const gateways = normalized.gateways || {};
        const psps = normalized.psps || {};

        const firstGw =
          Object.keys(gateways).find((k) =>
            gateways[k as GatewayId]?.configs?.some((c) => c.status === "ativo")
          ) || "mercadopago";

        const firstPsp =
          Object.keys(psps).find((k) =>
            psps[k as PspId]?.configs?.some((c) => c.status === "ativo")
          ) || "efipay";

        setSelectedGw(firstGw as GatewayId);
        setSelectedPsp(firstPsp as PspId);
      } catch (e) {
        // error handled silently
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const base =
      modeType === "gateway"
        ? Object.fromEntries(fieldsByGateway[selectedGw].map((f) => [f, ""]))
        : Object.fromEntries(fieldsByPsp[selectedPsp].map((f) => [f, ""]));

    setCreds(base);
    setVisibleFields(Object.fromEntries(Object.keys(base).map((k) => [k, false])));
    setMode("production");
  }, [modeType, selectedGw, selectedPsp]);

  // utilidades
  const toggleVisibility = (key: string) => setVisibleFields((v) => ({ ...v, [key]: !v[key] }));
  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value || "");
      setSnack({ open: true, severity: "success", message: "Copiado para a área de transferência" });
    } catch {
      setSnack({ open: true, severity: "error", message: "Falha ao copiar" });
    }
  };
  const isSecret = (field: string) => /key|secret|token|certificate/i.test(field);

  const save = async () => {
    setLoading(true);

    try {
      const payload = {
        scope: modeType,
        key: modeType === "gateway" ? selectedGw : selectedPsp,
        creds,
        mode,
      };

      const res = await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: any = await res.json();

      if (!res.ok) throw new Error(data?.error || "Erro ao salvar");

      const normalized = normalizeStore(data.store ?? data);

      setStore(normalized);

      setSnack({
        open: true,
        severity: "success",
        message: "Config salva",
      });

      setCreds(Object.fromEntries(Object.keys(creds).map((k) => [k, ""])));
    } catch (err: any) {
      setSnack({
        open: true,
        severity: "error",
        message: err.message,
      });
    } finally {
      setLoading(false);
    }
  };
    // remover gateway/psp inteiro
  const remove = async () => {
      setConfirmOpen(false);
      setLoading(true);
      try {
        const payload = modeType === "gateway" ? { type: "gateway", gateway: selectedGw } : { type: "psp", psp: selectedPsp };

        const res = await fetch("/api/vault", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data: any = await res.json();
        if (!res.ok) throw new Error(data?.error || "Erro ao remover");

        const newStore = data.store ? normalizeStore(data.store) : normalizeStore(data);
        setStore(newStore);
        setSnack({ open: true, severity: "success", message: "Removido" });
      } catch (err: any) {
        setSnack({ open: true, severity: "error", message: err?.message || "Erro" });
      } finally {
        setLoading(false);
      }
  };

  const updateConfigStatusGeneric = async (
    kind: "gateway" | "psp",
    key: string,
    id: string,
    status: "ativo" | "bloqueado" | "inativo"
  ) => {
    try {
      setLoading(true);

      const res = await fetch("/api/vault", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: kind,
          key,
          id,
          status,
        }),
      });

      const data: any = await res.json();

      if (!res.ok) throw new Error(data?.error || "Erro ao atualizar");

      applyStore(data);

      setSnack({
        open: true,
        severity: "success",
        message: "Status atualizado",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteConfigGeneric = async (
    kind: "gateway" | "psp",
    key: string,
    id: string
  ) => {
    try {
      setLoading(true);

      const res = await fetch("/api/vault", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: kind,
          key,
          id,
        }),
      });

      const data: any = await res.json();

      if (!res.ok) throw new Error(data?.error || "Erro ao excluir");

      applyStore(data);

      setSnack({
        open: true,
        severity: "success",
        message: "Config removida",
      });
    } finally {
      setLoading(false);
    }
  };

  function statusLabel(s: string) {
    if (s === "ativo") return "Em uso";
    if (s === "inativo") return "Sem uso";
    if (s === "bloqueado") return "Bloqueado";
    return s;
  }

  function statusColor(s: string) {
    if (s === "ativo") return "success";
    if (s === "bloqueado") return "warning";
    return "default";
  }

  const providerList = modeType === "gateway" ? Object.keys(fieldsByGateway) : Object.keys(fieldsByPsp);

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Card elevation={8} sx={{ borderRadius: 2 }}>
        <CardHeader
          avatar={<PaymentIcon color="primary" />}
          title={<Typography variant="h6">Configurações de Pagamento</Typography>}
          subheader={<Typography variant="body2" color="text.secondary">Gerencie credenciais de Gateways e PSPs</Typography>}
        />
        <Divider />
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Tipo</Typography>
                  <Stack direction="row" spacing={1}>
                    <Button variant={modeType === "gateway" ? "contained" : "outlined"} onClick={() => setModeType("gateway")}>Gateways</Button>
                    <Button variant={modeType === "psp" ? "contained" : "outlined"} onClick={() => setModeType("psp")}>PSPs</Button>
                  </Stack>
                </Box>

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Selecione</Typography>
                  <List dense>
                    {providerList.map((item) => {
                      const active = modeType === "gateway" ? selectedGw === item : selectedPsp === item;
                      return (
                        <ListItemButton
                          key={item}
                          selected={active}
                          onClick={() => (modeType === "gateway" ? setSelectedGw(item as GatewayId) : setSelectedPsp(item as PspId))}
                        >
                          <ListItemText primary={item.toUpperCase()} primaryTypographyProps={{ fontSize: 13 }} />
                        </ListItemButton>
                      );
                    })}
                  </List>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Dica: selecione o provedor à esquerda para editar credenciais. Apenas a configuração "Em uso" é exibida.
                  </Typography>
                </Box>
              </Stack>
            </Grid>

            <Grid item xs={12} md={8}>
              <Stack spacing={2}>
                {modeType === "gateway" && gatewaysWithTest[selectedGw] && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Modo</Typography>
                    <RadioGroup row value={mode} onChange={(e) => setMode(e.target.value as any)}>
                      <FormControlLabel value="test" control={<Radio />} label="Test" />
                      <FormControlLabel value="production" control={<Radio />} label="Production" />
                    </RadioGroup>
                  </Box>
                )}

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Credenciais</Typography>
                  <Grid container spacing={2}>
                    {Object.keys(creds).map((field) => {
                      const secret = isSecret(field);
                      const visible = !!visibleFields[field];
                      return (
                        <Grid item xs={12} sm={field.includes("certificate") ? 12 : 6} key={field}>
                          <TextField
                            fullWidth
                            label={field}
                            placeholder={field.includes("token") ? "ex: sk_test_xxx" : ""}
                            value={creds[field] ?? ""}
                            onChange={(e) => setCreds((c) => ({ ...c, [field]: e.target.value }))}
                            type={secret && !visible ? "password" : "text"}
                            InputProps={{
                              endAdornment: (
                                <InputAdornment position="end">
                                  {secret && (
                                    <Tooltip title={visible ? "Ocultar" : "Mostrar"}>
                                      <IconButton size="small" onClick={() => toggleVisibility(field)} aria-label={`toggle-${field}`}>
                                        {visible ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                  <Tooltip title="Copiar">
                                    <IconButton size="small" onClick={() => copyToClipboard(creds[field] ?? "")} aria-label={`copy-${field}`}>
                                      <ContentCopyIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </InputAdornment>
                              ),
                            }}
                          />
                        </Grid>
                      );
                    })}
                  </Grid>

                  <Box sx={{ mt: 1 }}>
                    <Button size="small" onClick={() => setOpenAdvanced((s) => !s)} endIcon={openAdvanced ? <ExpandLessIcon /> : <ExpandMoreIcon />}>
                      Campos avançados
                    </Button>

                    <Collapse in={openAdvanced}>
                      <Box sx={{ mt: 2, p: 2, border: "1px dashed", borderColor: "divider", borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Lista de configurações cadastradas para este provedor
                        </Typography>

                        {modeType === "gateway" ? (
                          store?.gateways?.[selectedGw]?.configs?.length ? (
                            <Stack spacing={1}>
                              {store!.gateways![selectedGw]!.configs!.map((cfg) => (
                                <Box
                                  key={cfg.id}
                                  sx={{
                                    display: "flex",
                                    gap: 1,
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    p: 1,
                                    borderRadius: 1,
                                    backgroundColor: "background.paper",
                                    border: "1px solid",
                                    borderColor: "divider",
                                  }}
                                >
                                  <Box>
                                    <Typography variant="body2">
                                      <strong>{cfg.id}</strong>{" "}
                                      <Typography component="span" variant="caption" color="text.secondary">
                                        ({cfg.mode || "—"})
                                      </Typography>
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {Object.keys(cfg.creds || {}).length} campos
                                    </Typography>
                                  </Box>

                                  <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                                    <Chip label={statusLabel(cfg.status)} color={statusColor(cfg.status)} size="small" />

                                    <Tooltip title="Em uso">
                                      <span>
                                        <IconButton
                                          size="small"
                                          color={cfg.status === "ativo" ? "primary" : "default"}
                                          onClick={() => {
                                            setPendingActivate({ kind: "gateway", key: selectedGw, id: cfg.id });
                                            setConfirmActivateOpen(true);
                                          }}
                                          disabled={loading || cfg.status === "ativo"}
                                          aria-label={`ativar-${cfg.id}`}
                                        >
                                          <CheckCircleIcon fontSize="small" />
                                        </IconButton>
                                      </span>
                                    </Tooltip>

                                    <Tooltip title="Sem uso">
                                      <span>
                                        <IconButton
                                          size="small"
                                          color={cfg.status === "inativo" ? "inherit" : "default"}
                                          onClick={() => updateConfigStatusGeneric("gateway", selectedGw, cfg.id, "inativo")}
                                          disabled={loading || cfg.status === "inativo"}
                                          aria-label={`inativar-${cfg.id}`}
                                        >
                                          <RadioButtonUncheckedIcon fontSize="small" />
                                        </IconButton>
                                      </span>
                                    </Tooltip>

                                    <Tooltip title="Bloquear">
                                      <span>
                                        <IconButton
                                          size="small"
                                          color={cfg.status === "bloqueado" ? "warning" : "default"}
                                          onClick={() => updateConfigStatusGeneric("gateway", selectedGw, cfg.id, "bloqueado")}
                                          disabled={loading || cfg.status === "bloqueado"}
                                          aria-label={`bloquear-${cfg.id}`}
                                        >
                                          <BlockIcon fontSize="small" />
                                        </IconButton>
                                      </span>
                                    </Tooltip>

                                    <Tooltip title="Excluir">
                                      <span>
                                        <IconButton
                                          size="small"
                                          color="error"
                                          onClick={() => {
                                            setPendingDelete({ kind: "gateway", key: selectedGw, id: cfg.id });
                                            setConfirmDeleteOpen(true);
                                          }}
                                          aria-label={`excluir-${cfg.id}`}
                                        >
                                          <DeleteOutlineIcon fontSize="small" />
                                        </IconButton>
                                      </span>
                                    </Tooltip>
                                  </Box>
                                </Box>
                              ))}
                            </Stack>
                          ) : (
                            <Typography variant="body2" color="text.secondary">Nenhuma configuração cadastrada para este provedor.</Typography>
                          )
                        ) : (
                          (store?.psps?.[selectedPsp] as any)?.configs?.length ? (
                            <Stack spacing={1}>
                              {(store!.psps![selectedPsp] as any).configs!.map((cfg: any) => (
                                <Box
                                  key={cfg.id}
                                  sx={{
                                    display: "flex",
                                    gap: 1,
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    p: 1,
                                    borderRadius: 1,
                                    backgroundColor: "background.paper",
                                    border: "1px solid",
                                    borderColor: "divider",
                                  }}
                                >
                                  <Box>
                                    <Typography variant="body2">
                                      <strong>{cfg.id}</strong>{" "}
                                      <Typography component="span" variant="caption" color="text.secondary">
                                        ({cfg.mode || "—"})
                                      </Typography>
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {Object.keys(cfg.creds || {}).length} campos
                                    </Typography>
                                  </Box>

                                  <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                                    <Chip label={statusLabel(cfg.status)} color={statusColor(cfg.status)} size="small" />

                                    <Tooltip title="Em uso">
                                      <span>
                                        <IconButton
                                          size="small"
                                          color={cfg.status === "ativo" ? "primary" : "default"}
                                          onClick={() => {
                                            setPendingActivate({ kind: "psp", key: selectedPsp, id: cfg.id });
                                            setConfirmActivateOpen(true);
                                          }}
                                          disabled={loading || cfg.status === "ativo"}
                                          aria-label={`ativar-psp-${cfg.id}`}
                                        >
                                          <CheckCircleIcon fontSize="small" />
                                        </IconButton>
                                      </span>
                                    </Tooltip>

                                    <Tooltip title="Sem uso">
                                      <span>
                                        <IconButton
                                          size="small"
                                          color={cfg.status === "inativo" ? "inherit" : "default"}
                                          onClick={() => updateConfigStatusGeneric("psp", selectedPsp, cfg.id, "inativo")}
                                          disabled={loading || cfg.status === "inativo"}
                                          aria-label={`inativar-psp-${cfg.id}`}
                                        >
                                          <RadioButtonUncheckedIcon fontSize="small" />
                                        </IconButton>
                                      </span>
                                    </Tooltip>

                                    <Tooltip title="Bloquear">
                                      <span>
                                        <IconButton
                                          size="small"
                                          color={cfg.status === "bloqueado" ? "warning" : "default"}
                                          onClick={() => updateConfigStatusGeneric("psp", selectedPsp, cfg.id, "bloqueado")}
                                          disabled={loading || cfg.status === "bloqueado"}
                                          aria-label={`bloquear-psp-${cfg.id}`}
                                        >
                                          <BlockIcon fontSize="small" />
                                        </IconButton>
                                      </span>
                                    </Tooltip>

                                    <Tooltip title="Excluir">
                                      <span>
                                        <IconButton
                                          size="small"
                                          color="error"
                                          onClick={() => {
                                            setPendingDelete({ kind: "psp", key: selectedPsp, id: cfg.id });
                                            setConfirmDeleteOpen(true);
                                          }}
                                          aria-label={`excluir-psp-${cfg.id}`}
                                        >
                                          <DeleteOutlineIcon fontSize="small" />
                                        </IconButton>
                                      </span>
                                    </Tooltip>
                                  </Box>
                                </Box>
                              ))}
                            </Stack>
                          ) : (
                            <Box>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Esta seção aplica-se a PSPs. Não há configurações múltiplas cadastradas.
                              </Typography>
                              {store?.psps?.[selectedPsp] ? (
                                <Box sx={{ p: 1, borderRadius: 1, backgroundColor: "background.paper", border: "1px solid", borderColor: "divider" }}>
                                  <Typography variant="caption" color="text.secondary">Credenciais registradas</Typography>
                                  <Typography variant="body2" sx={{ mt: 1 }}>{Object.keys(store.psps[selectedPsp]!.creds || {}).length} campos</Typography>
                                </Box>
                              ) : (
                                <Typography variant="body2" color="text.secondary">Nenhuma informação adicional para este PSP.</Typography>
                              )}
                            </Box>
                          )
                        )}
                      </Box>
                    </Collapse>
                  </Box>
                </Box>

                <Divider />

                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Button variant="outlined" color="error" onClick={() => setConfirmOpen(true)} disabled={loading}>
                    Remover
                  </Button>

                  <Button
                    variant="contained"
                    onClick={save}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress color="inherit" size={16} /> : undefined}
                  >
                    {loading ? "Salvando..." : "Salvar"}
                  </Button>
                </Stack>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirmar remoção</DialogTitle>
        <DialogContent>
          <Typography>Tem certeza que deseja remover a configuração selecionada? Esta ação não pode ser desfeita.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
          <Button color="error" onClick={remove}>Remover</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmActivateOpen} onClose={() => setConfirmActivateOpen(false)}>
        <DialogTitle>Ativar configuração</DialogTitle>
        <DialogContent>
          <Typography>
            Ativar esta configuração colocará ela como <strong>Em uso</strong> e marcará as demais como <strong>Sem uso</strong>.
            Deseja continuar?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmActivateOpen(false)}>Cancelar</Button>
          <Button
            onClick={async () => {
              if (!pendingActivate) return;
              setConfirmActivateOpen(false);
              setLoading(true);
              try {
                await updateConfigStatusGeneric(pendingActivate.kind, pendingActivate.key, pendingActivate.id, "ativo");
              } finally {
                setPendingActivate(null);
                setLoading(false);
              }
            }}
          >
            Ativar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)}>
        <DialogTitle>Confirmar exclusão</DialogTitle>
        <DialogContent>
          <Typography>Deseja realmente excluir a configuração <strong>{pendingDelete?.id}</strong>? Esta ação não pode ser desfeita.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)}>Cancelar</Button>
          <Button
            color="error"
            onClick={async () => {
              if (!pendingDelete) return;
              setConfirmDeleteOpen(false);
              setLoading(true);
              try {
                await deleteConfigGeneric(pendingDelete.kind, pendingDelete.key, pendingDelete.id);
              } finally {
                setPendingDelete(null);
                setLoading(false);
              }
            }}
          >
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setSnack((s) => ({ ...s, open: false }))} severity={snack.severity} sx={{ width: "100%" }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}  