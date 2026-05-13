"use client";

import { Box, Container, Paper, Typography } from "@mui/material";
import { useThemeContext } from "../../context/Layout/ThemeContext";

export default function PoliticaDevolucao() {
  const { mode } = useThemeContext();

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper
        elevation={3}
        sx={{
          p: 4,
          borderRadius: 2,
          bgcolor: mode === "light" ? "#fff" : "#1a1a1a",
          color: mode === "light" ? "#000" : "#fff",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
          Política de Devolução - Mupi Ecm
        </Typography>

        <Typography variant="body1" paragraph>
          A Mupi Ecm valoriza a satisfação de seus clientes. Esta política descreve os procedimentos para devoluções e reembolsos.
        </Typography>

        <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
          1. Direito de Arrependimento
        </Typography>
        <Typography variant="body1" paragraph>
          De acordo com o Código de Defesa do Consumidor, você tem o direito de se arrepender da compra em até 7 dias corridos a partir do recebimento do produto.
        </Typography>

        <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
          2. Condições para Devolução
        </Typography>
        <Typography variant="body1" paragraph>
          O produto deve estar em sua embalagem original, sem sinais de uso, acompanhado de todos os acessórios e nota fiscal. Produtos personalizados ou de higiene não podem ser devolvidos.
        </Typography>

        <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
          3. Processo de Devolução
        </Typography>
        <Typography variant="body1" paragraph>
          Entre em contato conosco através do e-mail suporte@mupi.com informando o número do pedido e motivo da devolução. Nossa equipe irá orientá-lo sobre os próximos passos.
        </Typography>

        <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
          4. Reembolso
        </Typography>
        <Typography variant="body1" paragraph>
          Após análise e aprovação da devolução, o reembolso será processado no mesmo meio de pagamento utilizado na compra, em até 10 dias úteis.
        </Typography>

        <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
          5. Troca por Defeito
        </Typography>
        <Typography variant="body1" paragraph>
          Produtos com defeito de fabricação podem ser trocados em até 30 dias após o recebimento, desde que o defeito seja comprovado.
        </Typography>

        <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
          6. Contato
        </Typography>
        <Typography variant="body1" paragraph>
          Para dúvidas sobre devoluções, entre em contato: suporte@mupi.com
        </Typography>

        <Typography variant="body2" sx={{ mt: 4, fontStyle: "italic" }}>
          Última atualização: {new Date().toLocaleDateString("pt-BR")}
        </Typography>
      </Paper>
    </Container>
  );
}