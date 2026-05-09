// src/components/Checkout/CheckoutSteps.tsx
"use client";

import React, { useEffect, useState } from "react";
import CheckoutAddress from "./CheckoutAddress";
import CheckoutPaymentForm from "./CheckoutPaymentForm";
import { useRouter } from "next/navigation";
import { Box, Button, Typography } from "@mui/material";
import { useCart } from "../../context/CartContext";
import { CheckoutPayload, GatewayNames, PaymentInput } from "../../types/types";

export default function CheckoutSteps() {
  const [step, setStep] = useState(0);
  const [selectedGateway, setSelectedGateway] = useState<GatewayNames>("mercadopago");
  const [gatewayConfigs, setGatewayConfigs] = useState<Partial<Record<GatewayNames, any>>>({});
  const [loading, setLoading] = useState(false);
  const [addressData, setAddressData] = useState<{
    name: string;
    email: string;
    cpf?: string;
    cep?: string;
    street?: string;
    number?: string;
    complement?: string;
    phone?: string;
  }>({
    name: "",
    email: "",
    cpf: "",
    cep: "",
    street: "",
    number: "",
    complement: "",
    phone: "",
  });

  const STORAGE_ADDRESS_KEY = "mupi_checkout_address_v1";
  const STORAGE_STEP_KEY = "mupi_checkout_step_v1";
  const STORAGE_GATEWAY_KEY = "mupi_checkout_gateway_v1";

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const savedAddress = localStorage.getItem(STORAGE_ADDRESS_KEY);
      if (savedAddress) {
        setAddressData(JSON.parse(savedAddress));
      }
    } catch {
      // ignore
    }

    try {
      const savedStep = localStorage.getItem(STORAGE_STEP_KEY);
      if (savedStep) {
        setStep(Number(savedStep));
      }
    } catch {
      // ignore
    }

    try {
      const savedGateway = localStorage.getItem(STORAGE_GATEWAY_KEY) as GatewayNames | null;
      if (savedGateway) {
        setSelectedGateway(savedGateway);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_ADDRESS_KEY, JSON.stringify(addressData));
  }, [addressData]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_STEP_KEY, String(step));
  }, [step]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_GATEWAY_KEY, selectedGateway);
  }, [selectedGateway]);

  const { items, totalItems, totalPrice, clearCart } = useCart();
  const router = useRouter();

  // Carrega config
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/vault");
      const data : any  = await res.json();
      setGatewayConfigs(data.store || {});

      } catch (err) {
        // Log silencioso no frontend - não expor detalhes sensíveis
        console.warn("Checkout: Falha ao carregar configurações de gateway");
      }
    })();
  }, []);

  const showError = (err: any) => {
    const notify = (window as any).__notify;

    const message =
      err?.message ||
      err?.response?.data?.error ||
      err?.response?.data?.message ||
      "Erro inesperado";

    notify?.modal({
      title: "Erro no pagamento",
      description: message,
      severity: "error",
      actions: [
        {
          label: "Fechar",
          onClick: () => notify.closeModal?.(),
        },
      ],
    });
  };

  const normalizeItems = () =>
    items.map((it) => ({
      id: String(it.id), 
      title: it.title,
      price: it.price,
      quantity: it.quantity,
      image: it.image ?? null,
  }));

  const handlePaymentFeedback = (data: any) => {
    const notify = (window as any).__notify;

    const goHome = () => {
      notify.closeModal?.();
      router.push("/");
    };

    const goToPayment = () => {
      notify.closeModal?.();
      setStep(2); // Volta para o formulário de pagamento
    };

    const status = data?.status || "error";

    // Formata o valor pago (amount vem em centavos)
    const valorPago = data?.amount 
      ? (data.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const messageByStatus: Record<string, string> = {
      approved: "Pagamento aprovado com sucesso",
      pending: "Pagamento em processamento",
      rejected: data?.message || "Pagamento recusado",
      error: data?.message || "Erro no pagamento",
    };

    const message = messageByStatus[status] || "Status desconhecido";

    // Descrição estruturada para o modal
    const getDescription = () => {
      if (status === "approved" && data?.cashbackCode) {
        return {
          type: "cashback" as const,
          text: `Total pago: ${valorPago}`,
          code: data.cashbackCode,
        };
      }
      if (status === "approved") {
        localStorage.removeItem(STORAGE_ADDRESS_KEY);
        localStorage.removeItem("mupi_checkout_payment_v1");
        localStorage.removeItem(STORAGE_STEP_KEY);
        localStorage.removeItem(STORAGE_GATEWAY_KEY);
        return `Pagamento aprovado!\n\nTotal pago: ${valorPago}`;
      }
      return message;
    };

    const map: Record<string, () => void> = {
      approved: () => {
        clearCart();
        notify?.modal({
          title: "Pagamento aprovado",
          description: getDescription(),
          severity: "success",
          actions: [{ label: "Concluir", onClick: goHome }],
        });
      },

      pending: () => {
        clearCart();
        notify?.modal({
          title: "Pagamento em processamento",
          description: `Seu pagamento está sendo processado.\n\nValor: ${valorPago}\n\nVocê receberá uma confirmação por email.`,
          severity: "info",
          actions: [{ label: "Concluir", onClick: goHome }],
        });
      },

      rejected: () => {
        notify?.modal({
          title: "Pagamento recusado",
          description: message,
          severity: "warning",
          actions: [{ label: "Concluir", onClick: goToPayment }],
        });
      },

      error: () => {
        notify?.modal({
          title: "Erro no pagamento",
          description: message,
          severity: "error",
          actions: [{ label: "Concluir", onClick: goToPayment }],
        });
      },
    };

    (map[status] || map.error)();
  };
  
  if (totalItems === 0) {
    return (
      <div className="max-w-3xl mx-auto p-4 mb-10">
        <Box sx={{ textAlign: "center", py: 12 }}>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
            Seu carrinho está vazio
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Adicione produtos ao carrinho antes de acessar o checkout.
          </Typography>
          <Button variant="contained" onClick={() => router.push("/")}>Ir para loja</Button>
        </Box>
      </div>
    );
  }

  // =====================================================
  // PAGAR
  // =====================================================
  const handlePay = async (paymentInput: PaymentInput) => {
    setLoading(true);

    try {
      const orderId = crypto.randomUUID();
      const { createIdempotencyContext } = await import("../../lib/utils/idempotency");
      const idempotencyCtx = createIdempotencyContext(orderId);

      const payload: CheckoutPayload = {
        gateway: selectedGateway,
        payment: {
          ...paymentInput,
          idempotencyKey: idempotencyCtx.idempotencyKey,
          payer: {
            ...paymentInput.payer,
            phone: addressData.phone,
          },
          metadata: {
            ...paymentInput.metadata,
            complement: addressData.complement,
            phone: addressData.phone,
          },
        },
        order: {
          orderId,
          items: normalizeItems(),
          totalItems,
          total: totalPrice,
        },
      };

      const res = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...idempotencyCtx.headers,
        },
        body: JSON.stringify(payload),
      });

      const data : any = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro na comunicação com servidor");
      }

      handlePaymentFeedback(data);

    } catch (err) {
      showError(err);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <div className="max-w-3xl mx-auto p-4 mb-10">
      {step === 0 && (
        <CheckoutAddress
        initialData={addressData}
        onNext={(data) => {
            setAddressData({
              name: data.name || "",
              email: data.email || "",
              cpf: data.cpf || "",
              cep: data.cep || "",
              street: data.street || "",
              number: data.number || "",
              complement: data.complement || "",
              phone: data.phone || "",
            });
            setStep(2);
          }}
        />
      )}

      {step === 2 && (
        <CheckoutPaymentForm
          gateway={selectedGateway}
          gatewayConfigs={gatewayConfigs}
          onGatewayChange={setSelectedGateway}
          onBack={() => setStep(0)}
          onPay={handlePay}
          userData={addressData}
        />
      )}

      {loading && (
        <div style={{ textAlign: "center", marginTop: 12 }}>
          Processando pagamento...
        </div>
      )}
    </div>
  );
}