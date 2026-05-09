"use client"; // <--- Adicione isso aqui

import "./globals.css";
import Script from "next/script";

import { ThemeProvider } from "../context/ThemeContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { CartProvider } from "../context/CartContext";
import { NotificationProvider } from "../context/NotificationContext";
import { AuthProvider } from "../context/AuthContext";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col">

        {/* ✅ SDK Mercado Pago */}
        <Script
          src="https://sdk.mercadopago.com/js/v2"
          strategy="beforeInteractive"
        />

        <ThemeProvider>
          <AuthProvider>
            <CartProvider>
              <NotificationProvider>
                <Navbar />
                <main className="flex-1 w-full flex flex-col">
                  {children}
                </main>
                <Footer />
              </NotificationProvider>
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>

      </body>
    </html>
  );
}