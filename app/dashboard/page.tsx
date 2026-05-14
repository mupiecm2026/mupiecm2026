// src/app/dashboard/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  CircularProgress,
  Chip,
  Divider,
  Paper,
  Stack,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
} from "@mui/material";
import axios from "axios";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";

interface HealthItem {
  name: string;
  ok: boolean;
  lastCheck: string;
  message?: string;
  loading?: boolean;
}

interface CashbackItem {
  code: string;
  amount: number;
  gateway: string;
  ttl: number;
  paid: boolean;
  createdAt?: string;
}

interface NFItem {
  id: string;
  orderId: string;
  date: string;
  time: string;
  total: number;
}

export default function DashboardPage() {
  const [redis, setRedis] = useState<HealthItem>({ name: "Redis", ok: false, lastCheck: "-", message: "", loading: true });
  const [psp, setPsp] = useState<HealthItem>({ name: "PSP (EfiPay)", ok: false, lastCheck: "-", message: "", loading: true });
  const [gateways, setGateways] = useState<HealthItem[]>([]);
  const [cashbacks, setCashbacks] = useState<CashbackItem[]>([]);
  const [loadingCashbacks, setLoadingCashbacks] = useState(true);
  const [nfs, setNfs] = useState<NFItem[]>([]);
  const [loadingNfs, setLoadingNfs] = useState(true);

  const gatewayNames = useMemo(
    () => ["cielo", "mercadopago", "pagarme", "stripe", "getnet", "adyen", "sumup"],
    []
  );

  const nowString = () => new Date().toLocaleTimeString();

  const fetchHealth = useCallback(async () => {
    // marca loading individual
    setRedis((r) => ({ ...r, loading: true }));
    setPsp((p) => ({ ...p, loading: true }));
    setGateways((g) => g.map((x) => ({ ...x, loading: true })));

    try {
      const [redisRes] = await Promise.all([
        axios.get("/api/health/redis").catch((e) => ({ data: { success: false, error: e?.response?.data?.error || e.message } })),
      ]);

      const now = nowString();

      setRedis({
        name: "Redis",
        ok: !!redisRes.data.success,
        lastCheck: now,
        message: redisRes.data.error || "",
        loading: false,
      });

      setPsp({
        name: "PSP (EfiPay)",
        ok: false, // Not implemented yet
        lastCheck: now,
        message: "Not implemented",
        loading: false,
      });

      const gatewayChecks = await Promise.all(
        gatewayNames.map(async (g) => {
          try {
            const r = await axios.get(`/api/health/gateway?name=${g}`);

            return {
              name: g.toUpperCase(),
              ok: r.data.status?.status === "healthy",
              lastCheck: now,
              message:
                r.data.status?.latency
                  ? `Latency: ${r.data.status.latency}ms`
                  : "",
              loading: false,
            } as HealthItem;
          } catch (err: any) {
            const msg =
              err?.response?.data?.error ||
              err?.message ||
              "Erro desconhecido";

            return {
              name: g.toUpperCase(),
              ok: false,
              lastCheck: now,
              message: msg,
              loading: false,
            } as HealthItem;
          }
        })
      );

      setGateways(gatewayChecks);
    } catch (err) {
      const now = nowString();
      setRedis({ name: "Redis", ok: false, lastCheck: now, message: "Erro ao buscar", loading: false });
      setPsp({ name: "PSP (EfiPay)", ok: false, lastCheck: now, message: "Erro ao buscar", loading: false });
      setGateways(gatewayNames.map((g) => ({ name: g.toUpperCase(), ok: false, lastCheck: now, message: "Erro ao buscar", loading: false })));
    }
  }, [gatewayNames]);

  const fetchCashbacks = useCallback(async () => {
    setLoadingCashbacks(true);
    try {
      const r = await axios.get("/api/cashback/list");
      setCashbacks(Array.isArray(r.data) ? r.data : []);
    } catch (err: any) {
      setCashbacks([]);
    } finally {
      setLoadingCashbacks(false);
    }
  }, []);

  const fetchNfs = useCallback(async () => {
    setLoadingNfs(true);
    try {
      const r = await axios.get("/api/nf/list");
      setNfs(r.data);
    } catch (err: any) {
      setNfs([]);
    } finally {
      setLoadingNfs(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await fetchHealth();
      await fetchCashbacks();
      await fetchNfs();
    })();

    const interval = setInterval(() => {
      if (!mounted) return;
      fetchHealth();
      fetchCashbacks();
      fetchNfs();
    }, 1000 * 60 * 60 * 2); // 2 horas

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [fetchHealth, fetchCashbacks, fetchNfs]);

  const Dot = ({ ok }: { ok: boolean }) => (
    <Box
      sx={{
        width: 12,
        height: 12,
        borderRadius: "50%",
        backgroundColor: ok ? "#27AE60" : "#EB5757",
        boxShadow: ok ? "0 0 8px #27AE60" : "0 0 8px #EB5757",
        mr: 1,
      }}
      aria-hidden
    />
  );

  const renderHealthCard = (item: HealthItem) => (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardHeaderCompact title={item.name} />
      <CardContent>
        {item.loading ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="textSecondary">Verificando...</Typography>
          </Box>
        ) : (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Stack direction="row" alignItems="center">
              <Dot ok={item.ok} />
              <Typography sx={{ fontWeight: 600 }}>{item.ok ? "Online" : "Offline"}</Typography>
            </Stack>

            <Box sx={{ textAlign: "right" }}>
              <Typography variant="body2" color="textSecondary">Último check: {item.lastCheck}</Typography>
              {item.message && <Typography variant="body2" color="error">{item.message}</Typography>}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  // Terminal-like rendering for cashback
  const terminalLines = useMemo(() => {
    if (loadingCashbacks) return ["$ carregando cashbacks..."];
    if (!cashbacks.length) return ["$ nenhum cashback registrado."];

    return cashbacks.map((cb) => {
      const status = cb.paid ? "PAID" : "PENDING";
      const value = (cb.amount / 100).toFixed(2).padStart(8, " ");
      const ttl = cb.ttl != null ? `${cb.ttl}s` : "-";
      return `$ ${cb.code} | ${cb.gateway.toUpperCase()} | R$ ${value} | TTL ${ttl} | ${status}`;
    });
  }, [cashbacks, loadingCashbacks]);

  const copyLine = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  };

  const formatCurrency = (cents: number) =>
    (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
        Health Dashboard
      </Typography>

      {/* Infra section */}
      <SectionTitle title="Infra" subtitle="Serviços de infraestrutura" />
      <Grid container spacing={3} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          {renderHealthCard(redis)}
        </Grid>
        <Grid item xs={12} md={4}>
          {renderHealthCard(psp)}
        </Grid>
      </Grid>

      {/* Gateways section */}
      <SectionTitle title="Gateways" subtitle="Verificação de gateways de pagamento" />
      <Grid container spacing={3} sx={{ mb: 2 }}>
        {gateways.map((g) => (
          <Grid key={g.name} item xs={12} sm={6} md={3}>
            {renderHealthCard(g)}
          </Grid>
        ))}
      </Grid>

      {/* Cashback Terminal (terminal-like) */}
      <SectionTitle title="Cashback Terminal" subtitle="Visualização estilo terminal (linha por cashback)" />
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper
            elevation={3}
            sx={{
              backgroundColor: "#0b1220",
              color: "#c7f9d6",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, 'Roboto Mono', monospace",
              p: 2,
              borderRadius: 1,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
              <Typography sx={{ color: "#9be7a6", fontWeight: 700 }}>$ cashback-terminal</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" sx={{ color: "#9aa7b2" }}>
                  {loadingCashbacks ? "carregando..." : `${cashbacks.length} item(s)`}
                </Typography>
                <Tooltip title="Atualizar">
                  <IconButton
                    size="small"
                    onClick={() => {
                      fetchCashbacks();
                      fetchHealth();
                    }}
                    sx={{ color: "#9aa7b2" }}
                  >
                    <ContentCopyIcon sx={{ transform: "rotate(90deg)" }} />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>

            <Divider sx={{ borderColor: "#1f2a36", mb: 1 }} />

            <Box sx={{ maxHeight: 320, overflow: "auto" }}>
              {terminalLines.map((line, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    py: 0.5,
                    px: 1,
                    borderRadius: 0.5,
                    "&:hover": { backgroundColor: "rgba(255,255,255,0.02)" },
                  }}
                >
                  <Typography sx={{ fontFamily: "inherit", fontSize: 13 }}>{line}</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="caption" sx={{ color: "#7fbf8a" }}>
                      {idx === 0 && loadingCashbacks ? "" : ""}
                    </Typography>
                    <Tooltip title="Copiar linha">
                      <IconButton size="small" onClick={() => copyLine(line)} sx={{ color: "#9aa7b2" }}>
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
              ))}
            </Box>

            <Divider sx={{ borderColor: "#1f2a36", mt: 1 }} />

            <Box sx={{ mt: 1, display: "flex", gap: 2, alignItems: "center" }}>
              <Typography variant="caption" sx={{ color: "#9aa7b2" }}>
                Total:
              </Typography>
              <Typography variant="body2" sx={{ color: "#c7f9d6", fontWeight: 600 }}>
                {cashbacks.length} registro(s)
              </Typography>
              <Box sx={{ flex: 1 }} />
              <Typography variant="caption" sx={{ color: "#9aa7b2" }}>
                Valores em R$
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* NF Listing */}
      <SectionTitle title="Notas Fiscais" subtitle="Lista de NFs geradas" />
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID da NF</TableCell>
                    <TableCell>Pedido</TableCell>
                    <TableCell>Data</TableCell>
                    <TableCell>Hora</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="center">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingNfs ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : nfs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        Nenhuma NF encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    nfs.map((nf) => (
                      <TableRow key={nf.id}>
                        <TableCell>{nf.id}</TableCell>
                        <TableCell>{nf.orderId}</TableCell>
                        <TableCell>{nf.date}</TableCell>
                        <TableCell>{nf.time}</TableCell>
                        <TableCell align="right">R$ {nf.total.toFixed(2).replace(".", ",")}</TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            onClick={() => window.open(`/api/nf/download?id=${nf.id}&format=png`, '_blank')}
                          >
                            PNG
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Box sx={{ mb: 1 }}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="textSecondary" sx={{ display: "block", mb: 1 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}

function CardHeaderCompact({ title }: { title: string }) {
  return (
    <CardHeader
      title={<Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{title}</Typography>}
      sx={{ pb: 0 }}
    />
  );
}