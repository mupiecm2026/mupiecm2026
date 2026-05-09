
import { OrderData, PaymentInput, PaymentResult } from "../../../types/types";
import { logger } from "../../utils/logger";
import { GatewayConfigService } from "../gateway-config-service";
import { GatewayInterface } from "../payment-processor";
import { getGatewayUrl } from "../../utils/gateway-urls";

export class MercadoPagoGateway implements GatewayInterface {
  private baseUrl = getGatewayUrl("mercadopago");
  constructor(private configService: GatewayConfigService) {}

  
  async getHealthStatus(): Promise<{ status: string; latency: number }> {
    const start = Date.now();
    try {
      const config = await this.getConfig();
      const response = await fetch(`${this.baseUrl}/users/me`, {
        headers: { Authorization: `Bearer ${config.access_token}` },
      });
      return { status: response.ok ? "healthy" : "unhealthy", latency: Date.now() - start };
    } catch (err: any) {
      return { status: "unhealthy", latency: Date.now() - start };
    }
  }

  async processPayment(
    payment: PaymentInput,
    order: OrderData
  ): Promise<PaymentResult> {
    try {
      if (!payment.token) {
        return {
          success: false,
          status: "rejected",
          message: "Token não informado",
          errorCode: "PROCESSING_ERROR",
          gateway: "mercadopago",
        };
      }

      const config = await this.getConfig();

      const payload = {
        transaction_amount: payment.amount / 100,
        token: payment.token,
        description: `Pedido ${order.orderId}`,
        installments: payment.installments,
        payment_method_id: payment.paymentMethodId,
        payer: {
          email: payment.payer.email,
          ...this.splitUserName(payment.payer.name),
          identification: {
            type: "CPF",
            number: payment.payer.cpf?.replace(/\D/g, ""),
          },
        },
        metadata: {
          order_id: order.orderId,
          items_count: order.totalItems,
          remote_ip: payment.remoteIp,
          // Device fingerprints for anti-fraud
          ...(payment.deviceFingerprints?.mercadopago && {
            device_id: payment.deviceFingerprints.mercadopago.deviceId,
          }),
        },
      };

      const headers: Record<string, string> = {
        Authorization: `Bearer ${config.access_token}`,
        "Content-Type": "application/json",
      };

      if (payment.idempotencyKey) {
        headers["X-Idempotency-Key"] = payment.idempotencyKey;
      }

      const res = await fetch(`${this.baseUrl}/v1/payments`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data : any = await res.json();

      // =========================
      // 🔴 ERRO HTTP DO MP
      // =========================
      if (!res.ok) {
        const rawError =
          data?.cause?.[0]?.code ||
          data?.cause?.[0]?.description ||
          data?.message ||
          data?.error ||
          "unknown_error";

        const errorCode = this.mapErrorCode(rawError);

        logger.error("[MP] API Error Response", {
          orderId: order.orderId,
          httpStatus: res.status,
          rawError,
          raw: data,
        });

        return {
          success: false,
          status: "rejected",
          gateway: "mercadopago",
          errorCode,
          message: this.getUserMessage(errorCode),
          raw: data,
        };
      }

      // =========================
      // 🔵 SUCESSO
      // =========================
      const status = this.normalizeStatus(data.status, data.status_detail);
      const errorCode = this.mapErrorCode(data.status_detail);

      logger.info("[MP] Payment processed", {
        orderId: order.orderId,
        status: data.status,
        statusDetail: data.status_detail,
        normalizedStatus: status,
        transactionId: data?.id,
      });

      const message =
        status === "approved"
          ? "Pagamento aprovado - dinheiro creditado"
          : status === "pending"
          ? "Pagamento autorizado. Aguardando confirmação do banco..."
          : "Pagamento rejeitado";

      return {
        success: status === "approved",
        transactionId: data?.id ? String(data.id) : undefined,
        status,
        message,
        errorCode,
        providerStatus: data?.status_detail,
        gateway: "mercadopago",
        raw: data,
      };
    } catch (err: any) {
      logger.error("[MP] Fatal error", { message: err.message });

      return {
        success: false,
        status: "error",
        message: "Erro interno ao processar pagamento",
        errorCode: "PROCESSING_ERROR",
        gateway: "mercadopago",
      };
    }
  }

  private splitUserName(fullName?: string) {
    const name = fullName?.trim();
    if (!name) {
      return { first_name: "Cliente", last_name: undefined };
    }

    const parts = name.split(/\s+/);
    return {
      first_name: parts[0] || "Cliente",
      last_name: parts.slice(1).join(" ") || undefined,
    };
  }

  private normalizeStatus(status: string, statusDetail?: string): PaymentResult["status"] {
    // Regra do "verdadeiro aprovado": apenas status_detail === "accredited" = dinheiro creditado
    // approved + accredited = verdadeiro aprovado
    // approved + other = apenas autorizado, não capturado
    const isFullyApproved = status === "approved" && statusDetail === "accredited";
    
    if (isFullyApproved) {
      return "approved";
    }
    
    const map: Record<string, PaymentResult["status"]> = {
      approved: "pending", // Aprovado mas não creditado = pending
      in_process: "pending",
      pending: "pending",
      rejected: "rejected",
      authorized: "pending",
      cancelled: "rejected",
    };
    return map[status] || "error";
  }

  private async getConfig() {
    const activeConfig = await this.configService.getActiveConfig("gateway", "mercadopago");
    if (!activeConfig?.creds?.access_token) {
      throw new Error("[MP] access_token ausente");
    }
    return activeConfig.creds as { access_token: string };
  }

  private mapErrorCode(statusDetail?: string): PaymentResult["errorCode"] {
    const map: Record<string, PaymentResult["errorCode"]> = {
      cc_rejected_insufficient_amount: "INSUFFICIENT_FUNDS",
      cc_rejected_other_reason: "CARD_DECLINED",
      cc_rejected_bad_filled_security_code: "INVALID_CARD",
      cc_rejected_bad_filled_date: "INVALID_CARD",
      cc_rejected_bad_filled_other: "INVALID_CARD",
      cc_rejected_call_for_authorize: "REQUIRES_AUTH",
      cc_rejected_card_disabled: "CARD_DECLINED",
      cc_rejected_duplicated_payment: "PROCESSING_ERROR",
      cc_rejected_high_risk: "FRAUD_DETECTED",

      bin_not_found: "INVALID_CARD",
      invalid_token: "PROCESSING_ERROR",

      // 🔥 Mercado Pago erros reais
      error_pricing: "PROCESSING_ERROR",
      bad_request: "PROCESSING_ERROR",
      unknown_error: "UNKNOWN",
    };

    return map[statusDetail || ""] || "UNKNOWN";
  }

  private getUserMessage(code?: PaymentResult["errorCode"]) {
    const map: Record<string, string> = {
      INSUFFICIENT_FUNDS: "Saldo insuficiente.",
      CARD_DECLINED: "Cartão recusado.",
      INVALID_CARD: "Os dados do cartão estão incorretos (BIN inválido).",
      EXPIRED_CARD: "Cartão expirado.",
      FRAUD_DETECTED: "Recusado por segurança.",
      PROCESSING_ERROR: "Falha técnica no processamento.",
      REQUIRES_AUTH: "Autorize no seu banco.",
      UNKNOWN: "Não autorizado.",
    };
    return map[code || "UNKNOWN"];
  }
}