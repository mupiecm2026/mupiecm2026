import { NextResponse } from 'next/server';
import { GatewayConfigService } from '../../../../../lib/services/gateway-config-service';
import { logger } from '../../../../../lib/utils/logger';

function getService(context: any) {
const env = context.env;

  return new GatewayConfigService(env);
}


export async function GET(context: any) {
    const service = getService(context);

  try {
    const store = await service.getStore();
    const activeConfig = store.psps?.efipay?.configs?.find((cfg : any) => cfg.status === 'ativo');

    return NextResponse.json({
      success: true,
      ok: !!activeConfig,
      error: activeConfig ? null : 'Nenhuma configuração ativa encontrada para EfiPay.',
    });
  } catch (error) {
    logger.error('Failed PSP health check', { error: (error as Error).message });
    return NextResponse.json({ success: false, ok: false, error: (error as Error).message }, { status: 500 });
  }
}