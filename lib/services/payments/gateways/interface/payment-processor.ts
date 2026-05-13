import {
  GatewayNames,
  OrderData,
  PaymentResult,
  PaymentInput,
} from "../../../../../types/types";
import { CashbackService } from "../../../sales/cashback/cashback-service";
import { logger } from "../../../../utils/logger";
import { GatewayConfigService } from "../configurations/gateway-config-service";
import NFService from "../../../sales/nf/nf-service";
import { StripeGateway } from "../stripe";
import { PagarmeGateway } from "../pagarme";
import { CieloGateway } from "../cielo";
import { MercadoPagoGateway } from "../mercadopago";
import { GetnetGateway } from "../getnet";
import { AdyenGateway } from "../adyen";
import { SumupGateway } from "../sumup";
import { ValidationService } from "../../../security_risk/validation-service";
import { RiskService } from "../../../security_risk/risk-service";

export interface GatewayInterface {
  processPayment(
    payment: PaymentInput,
    order: OrderData
  ): Promise<PaymentResult>;

  getHealthStatus(): Promise<{ status: string; latency: number }>;

  capturePayment?(transactionId: string): Promise<PaymentResult>;

  refundPayment?(
    transactionId: string,
    amount?: number
  ): Promise<PaymentResult>;

  getPaymentStatus?(transactionId: string): Promise<PaymentResult>;
}

export class PaymentProcessor {
  private gateways = new Map<GatewayNames, GatewayInterface>();

  constructor(
    private configService: GatewayConfigService,
    private cashbackService: CashbackService,
    private validationService: ValidationService = new ValidationService(),
    private riskService: RiskService = new RiskService(),
    private nfService?: NFService
  ) {
    this.initializeGateways();
  }

  // =========================================
  // INIT GATEWAYS
  // =========================================
  private initializeGateways() {
    this.gateways.set(
      "mercadopago",
      new MercadoPagoGateway(this.configService)
    );
    this.gateways.set("stripe", new StripeGateway(this.configService));
    this.gateways.set("pagarme", new PagarmeGateway(this.configService));
    this.gateways.set("cielo", new CieloGateway(this.configService));
    this.gateways.set("getnet", new GetnetGateway(this.configService));
    this.gateways.set("adyen", new AdyenGateway(this.configService));
    this.gateways.set("sumup", new SumupGateway(this.configService));
  }

  // =========================================
  // PAYMENT FLOW
  // =========================================
  async processPayment(
    gatewayName: GatewayNames,
    payment: PaymentInput,
    order: OrderData
  ): Promise<PaymentResult> {
    logger.info("[Processor] Processing payment", {
      gateway: gatewayName,
      orderId: order.orderId,
      amount: payment.amount,
    });

    const gateway = this.gateways.get(gatewayName);

    if (!gateway) {
      return {
        success: false,
        status: "error",
        message: `Gateway ${gatewayName} não suportado`,
      };
    }

    try {
      // 1. VALIDAÇÃO DE DADOS CRÍTICOS
      const validation = this.validationService.validatePaymentInput(payment);
      if (!validation.isValid) {
        const firstError = validation.errors[0];
        return {
          success: false,
          status: "error",
          message: firstError.message,
          errorCode: firstError.code as any,
        };
      }

      // 2. ANÁLISE DE RISCO
      const riskAssessment = this.riskService.assessRisk(payment);
      if (riskAssessment.blocked) {
        return {
          success: false,
          status: "error",
          message: `Transação bloqueada por análise de risco: ${riskAssessment.reason}`,
          errorCode: "RISK_BLOCKED",
        };
      }

      // 3. PROCESSA PAGAMENTO NO GATEWAY
      const result = await gateway.processPayment(payment, order);

      // 4. CASHBACK SOMENTE SE APROVADO (não para pending)
      if (this.isApproved(result.status) && result.transactionId) {
        const cashbackCode =
          await this.cashbackService.generateCashbackCode(
            result.transactionId,
            payment.amount,
            payment.idempotencyKey
          );

        // 3. GERAR NF
        const nf = await this.nfService?.generateNF(order, payment, gatewayName);

        logger.info("[Processor] Cashback and NF generated", {
          transactionId: result.transactionId,
          cashbackCode,
          nfId: nf?.id,
        });

        return {
          ...result,
          amount: payment.amount, 
          cashbackCode: cashbackCode ?? undefined,
          nfId: nf?.id,
        }
      }

      // Para pending, também retorna o amount
      return {
        ...result,
        amount: payment.amount,
      };
    } catch (error) {
      const err = error as Error;

      logger.error("[Processor] Payment failed", {
        gateway: gatewayName,
        message: err.message,
        stack: err.stack,
      });

      return {
        success: false,
        status: "error",
        message: err.message || "Erro inesperado no pagamento",
      };
    }
  }

  // =========================================
  // HEALTH CHECK
  // =========================================
  async getGatewayHealth(gatewayName: GatewayNames) {
    const gateway = this.gateways.get(gatewayName);

    if (!gateway) {
      throw new Error(`Gateway ${gatewayName} não suportado`);
    }

    return gateway.getHealthStatus();
  }

  // =========================================
  // RULE
  // =========================================
  private isApproved(status: PaymentResult["status"]) {
    return status === "approved";
  }
}