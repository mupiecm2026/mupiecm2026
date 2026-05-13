import Link from "next/link";
import { Box, Container, Grid, Typography, useTheme } from "@mui/material";
import { useThemeContext } from "../context/ThemeContext";

const footerLinks = [
  {
    title: "Empresa",
    items: [
      { label: "Sobre", href: "/not-found" },
      { label: "Carreiras", href: "/not-found" },
      { label: "Blog", href: "/not-found" },
    ],
  },
  {
    title: "Recursos",
    items: [
      { label: "Cashback", href: "/cashback" },
      { label: "Configuração", href: "/config-page" },
    ],
  },
  {
    title: "Desenvolvedores",
    items: [
      { label: "API", href: "/not-found" },
      { label: "Documentação", href: "/not-found" },
      { label: "GitHub", href: "/not-found" },
    ],
  },
  {
    title: "Legal",
    items: [
      { label: "Política de Privacidade", href: "/not-found" },
      { label: "Termos de Uso", href: "/termos-de-uso" },
      { label: "Política de Devolução", href: "/politica-devolucao" },
      { label: "Cookies", href: "/not-found" },
    ],
  },
];

export default function Footer() {
  const { mode } = useThemeContext();
  const theme = useTheme();

  return (
    <Box
      component="footer"
      sx={{
        py: 6,
        borderTop: `1px solid ${mode === "light" ? "#E3E8EF" : "rgba(255,255,255,0.08)"}`,
        backgroundColor: mode === "light" ? "#FFFFFF" : "#0F1218",
        color: theme.palette.text.primary,
      }}
    >
      <Container>
        <Grid container spacing={4}>
          {footerLinks.map((column) => (
            <Grid key={column.title} item xs={12} sm={6} md={3}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                {column.title}
              </Typography>
              {column.items.map((item) => (
                <Box key={item.label} sx={{ mb: 1 }}>
                  <Link href={item.href}>
                    <Typography
                      sx={{
                        color: "text.secondary",
                        textDecoration: "none",
                        transition: "color 0.2s ease",
                        '&:hover': { color: theme.palette.primary.main },
                        cursor: "pointer",
                      }}
                    >
                      {item.label}
                    </Typography>
                  </Link>
                </Box>
              ))}
            </Grid>
          ))}
        </Grid>
        <Box sx={{ mt: 5, borderTop: `1px solid ${mode === "light" ? "#E3E8EF" : "rgba(255,255,255,0.08)"}`, pt: 4, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} Mupi. Todos os direitos reservados. Site em desenvolvimento.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
