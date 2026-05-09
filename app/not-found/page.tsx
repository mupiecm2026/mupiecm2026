import Link from "next/link";
import { Box, Button, Container, Typography } from "@mui/material";

export default function NotFound() {
  return (
    <Container sx={{ py: 12, textAlign: "center" }}>
      <Typography variant="h3" sx={{ fontWeight: 800, mb: 2 }}>
        404 — Página em desenvolvimento
      </Typography>
      <Typography variant="h6" sx={{ color: "text.secondary", mb: 4 }}>
        O robôzinho está montando essa página agora. Mas você pode voltar para a loja ou continuar o checkout.
      </Typography>
      <Box component="span" sx={{ fontSize: 80, lineHeight: 1, display: "block", mb: 4 }}>
        🤖
      </Box>
      <Box sx={{ display: "flex", justifyContent: "center", gap: 2, flexWrap: "wrap" }}>
        <Link href="/">
          <Button variant="contained" color="secondary" sx={{ minWidth: 160 }}>
            Ir para Home
          </Button>
        </Link>
        <Link href="/checkout">
          <Button variant="outlined" sx={{ minWidth: 160 }}>
            Ir para Checkout
          </Button>
        </Link>
      </Box>
    </Container>
  );
}
