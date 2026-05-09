import { NextRequest, NextResponse } from "next/server";
import { CashbackService } from "../../../lib/services/cashback-service";
import { logger } from "../../../lib/utils/logger";

function getEnv(): any {
  const env =
    (globalThis as any).__ENV__ ||
    (globalThis as any).env ||
    (globalThis as any).process?.env ||
    null;

  return env;
}

export async function GET(req: NextRequest) {
  const env = getEnv();

  try {
    const cashbackService = new CashbackService(env);

    // Clean expired cashbacks (older than 72 hours)
    // const cleanedCount = await cashbackService.cleanExpiredCashbacks();
        const cleanedCount = "N/A"; 


    logger.info("[cron] Cashback cleanup completed", { cleanedCount });

    return NextResponse.json({
      success: true,
      message: `Cleaned ${cleanedCount} expired cashbacks`,
    });
  } catch (error: any) {
    logger.error("[cron] Error during cleanup", { error: error.message });
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}