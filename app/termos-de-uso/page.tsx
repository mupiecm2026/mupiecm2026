"use client";

import { Box, Container, Paper, Typography } from "@mui/material";
import { useThemeContext } from "../../context/ThemeContext";

export default function TermosDeUso() {
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
          Termos de Uso - Mupi Ecm
        </Typography>

        <Typography variant="body1" paragraph>
          Bem-vindo aos Termos de Uso da Mupi Ecm. Estes termos descrevem as regras e condições para o uso de nossos serviços de e-commerce.
        </Typography>

        <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
          1. Aceitação dos Termos
        </Typography>
        <Typography variant="body1" paragraph>
          Ao acessar e usar o site da Mupi Ecm, você concorda em cumprir estes Termos de Uso. Se você não concordar com estes termos, por favor, não use nossos serviços.
        </Typography>

        <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
          2. Uso do Serviço
        </Typography>
        <Typography variant="body1" paragraph>
          Você concorda em usar nossos serviços apenas para fins legais e de acordo com estes termos. É proibido usar nossos serviços para qualquer atividade ilegal ou prejudicial.
        </Typography>

        <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
          3. Propriedade Intelectual
        </Typography>
        <Typography variant="body1" paragraph>
          Todo o conteúdo do site da Mupi Ecm, incluindo textos, imagens, logotipos e software, é propriedade da Mupi Ecm ou de seus licenciadores e é protegido por leis de direitos autorais.
        </Typography>

        <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
          4. Limitação de Responsabilidade
        </Typography>
        <Typography variant="body1" paragraph>
          A Mupi Ecm não se responsabiliza por quaisquer danos diretos, indiretos, incidentais ou consequenciais decorrentes do uso de nossos serviços.
        </Typography>

        <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
          5. Responsabilidade por Atos Fraudulentos e Segurança
        </Typography>
        <Typography variant="body1" paragraph>
          <strong>5.1 Isenção de Responsabilidade por Fraudes:</strong> A Mupi Ecm não assume qualquer responsabilidade por atos fraudulentos, tentativas de fraude, chargebacks indevidos ou qualquer uso indevido dos serviços de pagamento por terceiros. O usuário é integralmente responsável por todas as transações realizadas em seu nome.
        </Typography>
        <Typography variant="body1" paragraph>
          <strong>5.2 Dados Pessoais e de Pagamento:</strong> O usuário declara que todos os dados pessoais, informações de cartão de crédito e outras informações fornecidas são verdadeiras, precisas e de sua propriedade. A Mupi Ecm não se responsabiliza por dados incorretos ou fraudulentos fornecidos pelo usuário.
        </Typography>
        <Typography variant="body1" paragraph>
          <strong>5.3 Segurança das Transações:</strong> Embora implementemos medidas de segurança avançadas, incluindo validação de dados, análise de risco e conformidade com padrões PCI DSS, a Mupi Ecm não garante a aprovação de pagamentos, que depende exclusivamente das políticas dos bancos emissores e adquirentes.
        </Typography>
        <Typography variant="body1" paragraph>
          <strong>5.4 Chargebacks e Disputas:</strong> Em caso de chargebacks ou disputas junto aos bancos, o usuário assume total responsabilidade, incluindo custos administrativos, multas e prejuízos decorrentes. A Mupi Ecm cooperará com as investigações quando solicitado pelas autoridades competentes.
        </Typography>

        <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
          6. Obrigações do Usuário
        </Typography>
        <Typography variant="body1" paragraph>
          <strong>6.1 Uso Legal:</strong> O usuário se compromete a utilizar os serviços apenas para transações legais e legítimas, não envolvendo produtos ou serviços proibidos por lei.
        </Typography>
        <Typography variant="body1" paragraph>
          <strong>6.2 Veracidade das Informações:</strong> O usuário garante a veracidade de todas as informações fornecidas, incluindo dados pessoais, endereço de entrega e informações de pagamento.
        </Typography>
        <Typography variant="body1" paragraph>
          <strong>6.3 Segurança da Conta:</strong> O usuário é responsável por manter a confidencialidade de suas credenciais de acesso e notificar imediatamente a Mupi Ecm sobre qualquer uso não autorizado.
        </Typography>
        <Typography variant="body1" paragraph>
          <strong>6.4 Compliance:</strong> O usuário se compromete a cumprir todas as leis aplicáveis, incluindo leis de proteção de dados (LGPD), leis antifraude e regulamentações bancárias.
        </Typography>

        <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
          7. Modificações dos Termos
        </Typography>
        <Typography variant="body1" paragraph>
          Reservamo-nos o direito de modificar estes Termos de Uso a qualquer momento. As alterações entrarão em vigor imediatamente após a publicação no site.
        </Typography>

        <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
          8. Lei Aplicável
        </Typography>
        <Typography variant="body1" paragraph>
          Estes Termos de Uso são regidos pelas leis do Brasil. Qualquer disputa será resolvida nos tribunais competentes.
        </Typography>

        <Typography variant="body2" sx={{ mt: 4, fontStyle: "italic" }}>
          Última atualização: {new Date().toLocaleDateString("pt-BR")}
        </Typography>
      </Paper>
    </Container>
  );
}