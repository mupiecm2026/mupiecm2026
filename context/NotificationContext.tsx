"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import {
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  useTheme,
  Box,
  IconButton,
  Paper,
} from "@mui/material";
import {
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Info,
  ContentCopy,
} from "@mui/icons-material";

type ToastSeverity = "success" | "error" | "warning" | "info";

interface ToastOptions {
  duration?: number;
}

interface ModalAction {
  label: string;
  onClick: () => void;
  color?: "inherit" | "primary" | "error";
}

/**
 * 🔥 Descrição agora suporta:
 * - string simples
 * - cashback
 * - erro estruturado
 */
type ModalDescription =
  | string
  | {
      type: "cashback";
      text?: string;
      code: string;
    }
  | {
      type: "payment_error";
      message: string;
      code?: string;
      gateway?: string;
    };

interface ModalConfig {
  open?: boolean;
  title?: string;
  description?: ModalDescription;
  severity?: ToastSeverity;
  actions?: ModalAction[];
}

interface NotificationContextProps {
  toast: (msg: string, severity?: ToastSeverity, opts?: ToastOptions) => void;
  modal: (config: Omit<ModalConfig, "open">) => void;
  closeModal: () => void;
}

const NotificationContext = createContext<NotificationContextProps | null>(null);

export const useNotify = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotify must be used inside NotificationProvider.");
  return ctx;
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();

  const [toastState, setToast] = useState({
    open: false,
    message: "",
    severity: "info" as ToastSeverity,
    duration: 3500,
  });

  const [modalState, setModal] = useState<ModalConfig>({
    open: false,
    title: "",
    description: "",
    severity: "info",
    actions: [],
  });

  const toast = (
    message: string,
    severity: ToastSeverity = "info",
    opts?: ToastOptions
  ) => {
    setToast({
      open: true,
      message,
      severity,
      duration: opts?.duration ?? 3500,
    });
  };

  const modal = (config: Omit<ModalConfig, "open">) => {
    setModal({ ...config, open: true });
  };

  const closeModal = () =>
    setModal((m) => ({ ...m, open: false }));

  useEffect(() => {
    (window as any).__notify = { toast, modal, closeModal };
    return () => {
      try {
        delete (window as any).__notify;
      } catch {}
    };
  }, []);

  const getIcon = (severity: ToastSeverity) => {
    switch (severity) {
      case "success":
        return <CheckCircle color="success" sx={{ fontSize: 64 }} />;
      case "error":
        return <ErrorIcon color="error" sx={{ fontSize: 64 }} />;
      case "warning":
        return <Warning color="warning" sx={{ fontSize: 64 }} />;
      default:
        return <Info color="info" sx={{ fontSize: 64 }} />;
    }
  };

  const renderDescription = (d?: ModalDescription) => {
    if (!d) return null;

    // =========================
    // CASHBACK
    // =========================
    if (typeof d === "object" && d.type === "cashback") {
      return (
        <Box sx={{ px: 1 }}>
          {d.text && (
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ textAlign: "center", mb: 2 }}
            >
              {d.text}
            </Typography>
          )}

          <Paper
            variant="outlined"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              p: 2,
              borderRadius: 2,
              backgroundColor: theme.palette.mode === "dark"
                ? "rgba(255,255,255,0.05)"
                : "grey.100",
              mx: "auto",
              maxWidth: 340,
            }}
          >
            <Typography variant="h6" fontFamily="monospace">
              {d.code}
            </Typography>

            <IconButton
              onClick={() => navigator.clipboard.writeText(d.code)}
              size="small"
            >
              <ContentCopy fontSize="small" />
            </IconButton>
          </Paper>
        </Box>
      );
    }

    // =========================
    // ERRO DE PAGAMENTO (NOVO)
    // =========================
    if (typeof d === "object" && d.type === "payment_error") {
      return (
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="body1" sx={{ mb: 1 }}>
            {d.message}
          </Typography>

          {d.code && (
            <Typography variant="caption" color="text.secondary">
              Código: {d.code}
            </Typography>
          )}

          {d.gateway && (
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              Gateway: {d.gateway.toUpperCase()}
            </Typography>
          )}
        </Box>
      );
    }

    // =========================
    // STRING SIMPLES
    // =========================
    if (typeof d === "string") {
      return (
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ textAlign: "center" }}
        >
          {d}
        </Typography>
      );
    }

    return null;
  };

  return (
    <NotificationContext.Provider value={{ toast, modal, closeModal }}>
      {children}

      {/* TOAST */}
      <Snackbar
        open={toastState.open}
        autoHideDuration={toastState.duration}
        onClose={() => setToast((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={() => setToast((s) => ({ ...s, open: false }))}
          severity={toastState.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {toastState.message}
        </Alert>
      </Snackbar>

      {/* MODAL */}
      <Dialog
        open={Boolean(modalState.open)}
        onClose={closeModal}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: 6,
            p: 2,
            backgroundColor: theme.palette.background.paper,
          },
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
          {getIcon(modalState.severity ?? "info")}
        </Box>

        <DialogTitle
          sx={{
            textAlign: "center",
            pb: 0,
            fontWeight: 700,
          }}
        >
          {modalState.title ?? "Aviso"}
        </DialogTitle>

        <DialogContent sx={{ py: 1 }}>
          {renderDescription(modalState.description)}
        </DialogContent>

        <DialogActions sx={{ justifyContent: "flex-end", px: 3, pb: 2 }}>
          {modalState.actions?.length ? (
            modalState.actions.map((a, i) => (
              <Button
                key={i}
                onClick={a.onClick}
                variant={a.color === "inherit" ? "outlined" : "contained"}
                color={a.color ?? "primary"}
              >
                {a.label}
              </Button>
            ))
          ) : (
            <Button onClick={closeModal} variant="contained">
              Fechar
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </NotificationContext.Provider>
  );
}