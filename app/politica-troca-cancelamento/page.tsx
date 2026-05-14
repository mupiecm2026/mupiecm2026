"use client";

import { Box, Container, Typography } from "@mui/material";

export default function PolíticaTrocaCancelamento() {
  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h3" gutterBottom sx={{ fontWeight: 700, mb: 4 }}>
        Política de Troca e Cancelamento
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Cancelamento de Pedidos */}
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
            Cancelamento de Pedidos
          </Typography>
          <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.7 }}>
            Você pode cancelar seu pedido em até <strong>24 horas</strong> após a confirmação da compra. Após este período, o pedido será processado e enviado ao fornecedor.
          </Typography>
          <Typography variant="body1" sx={{ lineHeight: 1.7 }}>
            Para cancelar, entre em contato conosco através de nossa plataforma antes do prazo.
          </Typography>
        </Box>

        {/* Trocas */}
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
            Trocas
          </Typography>
          <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.7 }}>
            Aceitamos trocas de produtos em até <strong>30 dias</strong> após o recebimento, desde que:
          </Typography>
          <Box component="ul" sx={{ pl: 2, mb: 2 }}>
            <Typography component="li" sx={{ mb: 1 }}>
              O produto esteja em condições originais e não tenha sido utilizado
            </Typography>
            <Typography component="li" sx={{ mb: 1 }}>
              A embalagem original esteja íntegra
            </Typography>
            <Typography component="li">
              Todos os acessórios e manuais estejam inclusos
            </Typography>
          </Box>
        </Box>

        {/* Devoluções */}
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
            Devoluções
          </Typography>
          <Typography variant="body1" sx={{ lineHeight: 1.7 }}>
            Para mais informações sobre devoluções, consulte nossa <strong>Política de Devolução</strong> completa.
          </Typography>
        </Box>

        {/* Prazo de Entrega */}
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
            Prazo de Processamento
          </Typography>
          <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.7 }}>
            Após aprovação da troca ou cancelamento, o reembolso será processado em até <strong>7 dias úteis</strong>.
          </Typography>
        </Box>

        {/* Contato */}
        <Box sx={{ mt: 4, p: 2, backgroundColor: "rgba(0,0,0,0.04)", borderRadius: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
            Dúvidas? Entre em contato conosco. Estamos aqui para ajudar!
          </Typography>
        </Box>
      </Box>
    </Container>
  );
}
