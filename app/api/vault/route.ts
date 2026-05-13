import { NextRequest } from "next/server";
import { GatewayConfigService } from "../../../lib/services/gateway-config-service";

/**
 * Fonte única e confiável de env no OpenNext + Cloudflare
 */
function getEnv(): any {
  const env =
    (globalThis as any).__ENV__ ||
    (globalThis as any).env ||
    (globalThis as any).process?.env ||
    null;

  console.log("🌍 [getEnv] resolved:", {
    hasEnv: !!env,
    keys: env ? Object.keys(env) : "NO_ENV",
    hasKV: !!env?.PROD_KV_STORAGE,
    appEnv: env?.APP_ENV,
  });

  return env;
}

function service(env: any) {
  return new GatewayConfigService(env);
}

export async function GET(request: NextRequest) {
  const env = getEnv();

  console.log("🚀 GET /api/vault", {
    hasEnv: !!env,
    hasKV: !!env?.PROD_KV_STORAGE,
    appEnv: env?.APP_ENV,
  });

  try {
    const storeService = service(env);
    const store = await storeService.getStore();

    return Response.json({ success: true, store });
  } catch (error: any) {
    console.error("❌ GET ERROR:", error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const env = getEnv();

  try {
    const body: any = await request.json();

    const storeService = service(env);
    const store = await storeService.saveConfig(
      body.scope,
      body.key,
      body.creds,
      body.mode ?? "production",
      body.active ?? true
    );

    return Response.json({ success: true, store });
  } catch (error: any) {
    console.error("❌ POST ERROR:", error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const env = getEnv();

  try {
    const body: any = await request.json();

    const storeService = service(env);
    const store = await storeService.updateConfigStatus(
      body.scope,
      body.key,
      body.id,
      body.status
    );

    return Response.json({ success: true, store });
  } catch (error: any) {
    console.error("❌ PATCH ERROR:", error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const env = getEnv();

  try {
    const body: any = await request.json();

    const storeService = service(env);
    const store = await storeService.deleteConfig(
      body.scope,
      body.key,
      body.id
    );

    return Response.json({ success: true, store });
  } catch (error: any) {
    console.error("❌ DELETE ERROR:", error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}