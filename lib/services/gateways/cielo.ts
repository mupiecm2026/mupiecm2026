// lib/services/gateways/cielo.ts
import { PaymentInput, OrderData, PaymentResult } from "../../../types/types";
import { logger } from "../../utils/logger";
import { GatewayConfigService } from "../gateway-config-service";
import { GatewayInterface } from "../payment-processor";
import { detectCardBrand } from "../../utils/card-brand-detector";
import { getGatewayUrl } from "../../utils/gateway-urls";

export class CieloGateway implements GatewayInterface {
  constructor(private configService: GatewayConfigService) {}

  private getBaseUrl(merchantId: any) {
    return getGatewayUrl("cielo");
  }

  async processPayment(payment: PaymentInput, order: OrderData): Promise<PaymentResult> {
    try {
      const config = await this.getConfig();
      
      logger.debug("[Cielo] Processing payment", { orderId: order.orderId, amount: payment.amount });
      const url = this.getBaseUrl(config.merchantId);
      
      logger.debug("[Cielo] Request details", {
        url,
        merchantId: config.merchantId,
        merchantKeyPrefix: config.merchantKey?.substring(0, 8) + "...",
      });
      
      const card = payment.cardData || {
        number: (payment as any).cardNumber,
        holder: (payment as any).cardholderName,
        expMonth: (payment as any).expMonth,
        expYear: (payment as any).expYear,
        cvv: (payment as any).cvv,
      };

      const payload = this.buildPayload(payment, order, card);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "MerchantId": config.merchantId,
        "MerchantKey": config.merchantKey,
        "RequestId": crypto.randomUUID(),
      };

      if (payment.idempotencyKey) {
        headers["X-Idempotency-Key"] = payment.idempotencyKey;
      }

      const res = await fetch(`${url}/1/sales`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const responseText = await res.text();
      let data: any = null;
      try { data = JSON.parse(responseText); } catch (e) { data = null; }

      if (!res.ok) {
        const errorDetail = Array.isArray(data) ? data[0] : data;
        return {
          success: false,
          status: 'error',
          gateway: 'cielo',
          errorCode: 'PROCESSING_ERROR',
          message: `Falha na Autenticação: ${errorDetail?.Message || 'MerchantKey Inválida'}`,
          raw: data || responseText,
        };
      }

      const paymentData = data?.Payment;
      
      // Status Cielo: 0=None, 1=Autorizado, 2=Capturado, 3=Negado, 10=Cancelado
      // APENAS Status 2 = Capturado = dinheiro creditado = verdadeiro aprovado
      const status = paymentData?.Status;
      const isCaptured = status === 2; // Capturado = dinheiro creditado
      const isAuthorized = status === 1; // Autorizado = apenas aprovado, mas não capturado

      // Se autorizado mas não capturado, retorna pending (aguarda captura)
      if (isAuthorized && !isCaptured) {
        return {
          success: true,
          status: 'pending',
          transactionId: paymentData?.PaymentId,
          gateway: 'cielo',
          providerStatus: String(status),
          message: "Pagamento autorizado. Aguardando captura...",
          raw: data,
        };
      }

      return {
        success: isCaptured,
        status: isCaptured ? 'approved' : 'rejected',
        transactionId: paymentData?.PaymentId,
        gateway: 'cielo',
        providerStatus: String(status),
        message: paymentData?.ReturnMessage || (isCaptured ? "Pagamento capturado" : "Pagamento recusado"),
        raw: data,
      };

    } catch (error: any) {
      logger.error("[CIELO] Fatal Error", { message: error.message });
      return { success: false, status: 'error', gateway: 'cielo', message: error.message };
    }
  }

  private buildPayload(payment: PaymentInput, order: OrderData, card: any) {
    const formattedMonth = String(card.expMonth).padStart(2, "0");
    const formattedYear = String(card.expYear).length === 2 ? `20${card.expYear}` : card.expYear;

    // Detectar a bandeira do cartão dinamicamente
    const detectedBrand = detectCardBrand(card.number.replace(/\s/g, ""));
    // Mapear para o formato que a Cielo espera (uppercase, primeiro caractere maiúsculo)
    const brandMap: Record<string, string> = {
      visa: "Visa",
      mastercard: "Master",
      amex: "Amex",
      elo: "Elo",
      hipercard: "Hipercard",
      diners: "Diners",
      discover: "Discover",
      jcb: "Jcb",
    };
    const cieloBrand = brandMap[detectedBrand] || "Visa";

    // Build extra data collection with device fingerprints
    const extraDataCollection: any[] = [];
    
    if (payment.deviceId) {
      extraDataCollection.push({ Name: "device_id", Value: payment.deviceId });
    }
    
    if (payment.remoteIp) {
      extraDataCollection.push({ Name: "client_ip", Value: payment.remoteIp });
    }

    // Add Threatmetrix DFP session ID for Cielo anti-fraud
    if (payment.deviceFingerprints?.cielo?.dfpSessionId) {
      extraDataCollection.push({ 
        Name: "dfp_session_id", 
        Value: payment.deviceFingerprints.cielo.dfpSessionId 
      });
    }

    return {
      MerchantOrderId: order.orderId,
      Customer: {
      Name: (payment.payer?.name || "Cliente").substring(0, 255),
      Identity: payment.payer?.cpf || "00000000000",
      IdentityType: "CPF"
    },
      Payment: {
        Type: "CreditCard",
        Amount: Math.round(payment.amount), 
        Installments: payment.installments || 1,
        SoftDescriptor: "MUPISTORE", 
        Capture: true, 
        CreditCard: {
          CardNumber: card.number.replace(/\s/g, ""),
          Holder: card.holder,
          ExpirationDate: `${formattedMonth}/${formattedYear}`,
          SecurityCode: card.cvv,
          Brand: cieloBrand
        },
        ExtraDataCollection: extraDataCollection.length > 0 ? extraDataCollection : undefined,
      }
    };
  }
  
  async getConfig() {
    const config = await this.configService.getActiveConfig("gateway", "cielo");
    if (!config?.creds) throw new Error("Configuração Cielo não encontrada");

    const mId = config.creds.merchant_id || config.creds.merchantId;
    const mKey = config.creds.merchant_key || config.creds.merchantKey;

    if (!mId || !mKey) throw new Error("Credenciais incompletas no banco (merchant_id ou merchant_key)");

    return {
      merchantId: mId.trim(),
      merchantKey: mKey.trim(),
    };
  }

  async getHealthStatus() {
    const start = Date.now();
    try {
      const config = await this.getConfig();
      const url = this.getBaseUrl(config.merchantId);
      const res = await fetch(`${url}/1/sales`, {
        method: "OPTIONS",
        headers: { "MerchantId": config.merchantId, "MerchantKey": config.merchantKey }
      });
      return { status: res.status < 500 ? "healthy" : "unhealthy", latency: Date.now() - start };
    } catch {
      return { status: "unhealthy", latency: Date.now() - start };
    }
  }
}