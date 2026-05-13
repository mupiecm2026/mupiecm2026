import { NextRequest, NextResponse } from "next/server";
import { PaymentProcessor } from "../../../lib/services/payments/gateways/interface/payment-processor";
import { CashbackService } from "../../../lib/services/sales/cashback/cashback-service";
import { IdempotencyService } from "../../../lib/services/payments/enrich-payment/idempotency-service";
import { logger } from "../../../lib/utils/logger";
import { sendPaymentNotificationEmail } from "../../../lib/services/mails/email-service";
import { GatewayConfigService } from "../../../lib/services/payments/gateways/configurations/gateway-config-service";
import NFService from "../../../lib/services/sales/nf/nf-service";


function getEnv(): any {
  const env =
    (globalThis as any).__ENV__ ||
    (globalThis as any).env ||
    (globalThis as any).process?.env ||
    null;

  logger.debug("[payments] getEnv", {
    hasEnv: !!env,
    hasKV: !!env?.PROD_KV_STORAGE,
    appEnv: env?.APP_ENV,
  });

  return env;
}

export async function POST(req: NextRequest) {
  const env = getEnv();
  const idempotencyService = new IdempotencyService(env);

  try {
    const body = await req.json();
    const { gateway, payment, order }: any = body;

    // Extrair chave de idempotência dos headers para evitar duplicidade
    const idempotencyKey =
      req.headers.get("x-idempotency-key") ||
      req.headers.get("X-Idempotency-Key") ||
      payment?.idempotencyKey ||
      `idemp_${crypto.randomUUID()}`;

    const requestId =
      req.headers.get("x-request-id") ||
      req.headers.get("X-Request-ID") ||
      idempotencyKey;

    const stored = await idempotencyService.get(idempotencyKey);
    if (stored?.status === "completed" && stored.response) {
      logger.info("[payments] Idempotent response reused", {
        idempotencyKey,
        orderId: stored.orderId,
      });
      return NextResponse.json({ ...stored.response, duplicate: true });
    }

    if (stored?.status === "processing") {
      return NextResponse.json(
        {
          success: false,
          status: "pending",
          message: "Pagamento em processamento. Aguarde o término da primeira tentativa.",
          duplicate: true,
        },
        { status: 409 }
      );
    }

    await idempotencyService.saveProcessing(idempotencyKey, {
      orderId: order?.orderId,
      requestId,
      gateway,
    });

    console.log("💳 PAYMENT INPUT", {
      gateway,
      hasToken: !!payment?.token,
      amount: payment?.amount,
      orderId: order?.orderId,
      idempotencyKey: idempotencyKey?.substring(0, 20) + "...",
    });

    const configService = new GatewayConfigService(env);
    const cashbackService = new CashbackService(env);
    const nfService = new NFService(env);

    const processor = new PaymentProcessor(configService, cashbackService, undefined, undefined, nfService);

    const forwardedFor = req.headers.get("x-forwarded-for");
    const remoteIp =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      forwardedFor?.split(",")[0]?.trim() ||
      undefined;

    payment.idempotencyKey = payment.idempotencyKey || idempotencyKey;
    if (remoteIp) {
      payment.remoteIp = remoteIp;
      payment.metadata = {
        ...payment.metadata,
        remoteIp,
      };
    }

    const result = await processor.processPayment(gateway, payment, order);

    const enrichedResult: any = {
      ...result,
      gateway,
      idempotencyKey,
    };

    await idempotencyService.saveResult(idempotencyKey, enrichedResult, "completed", {
      orderId: order?.orderId,
      requestId,
      gateway,
    });

    if (
      payment?.payer?.email &&
      (result.status === "approved" || result.status === "pending")
    ) {
      try {
        const emailResult = await sendPaymentNotificationEmail(
          env,
          payment,
          order,
          enrichedResult
        );

        enrichedResult.emailNotification = emailResult.sent
          ? "sent"
          : "skipped";
        if (!emailResult.sent) {
          enrichedResult.emailNotificationReason = emailResult.reason;
        }
      } catch (emailError: any) {
        logger.warn("[payments] Email notification failed", {
          orderId: order?.orderId,
          emailError: emailError?.message || String(emailError),
        });
      }
    }

    return NextResponse.json(enrichedResult);

  } catch (err: any) {
    console.error("❌ MP ERROR RAW:", err?.response?.data || err);

    return NextResponse.json({
      success: false,
      error: err?.response?.data || err.message,
    });
  }
}