import { NextRequest, NextResponse } from "next/server";
import { HealthService } from "../../../../lib/services/health/health-service";
import { GatewayNames } from "../../../../types/types";
import { logger } from "../../../../lib/utils/logger";
import { GatewayConfigService } from "../../../../lib/services/payments/gateways/configurations/gateway-config-service";


export async function GET(request: NextRequest, context: any) {
  try {
    // ✅ PEGA O ENV DO CLOUDFLARE
    const env = context.env;

    // ✅ PASSA ENV PRO SERVICE
    const configService = new GatewayConfigService(env);

    // ✅ injeta no HealthService
    const healthService = new HealthService(configService);

    const { searchParams } = new URL(request.url);
    const gateway = searchParams.get("name") as GatewayNames | null;

    if (!gateway) {
      return NextResponse.json(
        { success: false, error: "Gateway name required" },
        { status: 400 }
      );
    }

    const status = await healthService.checkGateway(gateway);

    return NextResponse.json({
      success: true,
      status,
    });
  } catch (error) {
    logger.error("Gateway health check failed", {
      error: (error as Error).message,
    });

    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}