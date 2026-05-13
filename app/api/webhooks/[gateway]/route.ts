import { NextRequest, NextResponse } from "next/server";
import { PaymentOrchestrator } from "../../../../lib/services/payments/gateways/payment-orchestrator";
import { CashbackService } from "../../../../lib/services/sales/cashback/cashback-service";
import { logger } from "../../../../lib/utils/logger";

type RouteContext = {
  params: { gateway: string };
};

export async function POST(
  req: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { gateway } = context.params;

    // ✅ injeta env corretamente
    const cashback = new CashbackService(context.env);

    // ✅ injeta service no orchestrator
    const orchestrator = new PaymentOrchestrator(cashback);

    const contentType = req.headers.get("content-type") || "";

    let body: any;
    if (contentType.includes("application/json")) {
      body = await req.json();
    } else {
      const text = await req.text();
      body = JSON.parse(text || "{}");
    }

    const input = mapGatewayEvent(gateway, body);

    const result = await orchestrator.handlePaymentUpdate(input);

    return NextResponse.json({
      success: true,
      ...result,
    });

  } catch (err: any) {
    logger.error("Webhook error", {
      message: err?.message,
      stack: err?.stack,
    });

    return NextResponse.json(
      {
        success: false,
        error: err?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}

// O mapeador pode continuar fora pois é uma função pura (não depende de KV)
function mapGatewayEvent(gateway: string, body: any) {
  switch (gateway) {
    case "mercadopago":
      return {
        transactionId: body?.data?.id,
        status: body?.action || body?.type,
        amount: body?.data?.amount || 0,
        gateway,
      };
    case "stripe":
      return {
        transactionId: body?.data?.object?.id,
        status: body?.type === "payment_intent.succeeded" ? "succeeded" : "processing",
        amount: (body?.data?.object?.amount || 0) / 100,
        gateway,
      };
    case "cielo":
      return {
        transactionId: body?.PaymentId,
        status: body?.Status,
        amount: (body?.Amount || 0) / 100,
        gateway,
      };
    default:
      return {
        transactionId: body?.id,
        status: body?.status,
        amount: body?.amount || 0,
        gateway,
      };
  }
}