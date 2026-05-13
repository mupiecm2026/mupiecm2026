import { NextRequest, NextResponse } from 'next/server';
import { authService } from '../../../../lib/services/auth/auth-service';
import { CashbackService } from '../../../../lib/services/sales/cashback/cashback-service';
import { logger } from '../../../../lib/utils/logger';

function getSessionToken(request: NextRequest) {
  const cookie = request.headers.get('cookie') || '';
  return cookie
    .split(';')
    .find(c => c.trim().startsWith('mupi_session='))
    ?.split('=')[1];
}

async function requireMasterSession(request: NextRequest) {
  const token = getSessionToken(request);
  if (!token) return null;
  const session = await authService.getSession(token);
  if (!session || session.role !== 'master') return null;
  return session;
}

type CashoutBody = {
  code: string;
  pixKey: string;
};

export async function POST(request: NextRequest, context: any) {
  const session = await requireMasterSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // ✅ pega env do runtime
  const cashbackService = new CashbackService(context.env);

  try {
    const body = (await request.json()) as CashoutBody;
    const { code, pixKey } = body;

    const result = await cashbackService.cashoutCode(code, pixKey);

    logger.info('Cashback cashed out', {
      code,
      amount: result.amount
    });

    return NextResponse.json({ success: true, ...result });

  } catch (error) {
    const err = error as Error;

    logger.error('Cashback cashout failed', {
      error: err.message,
      stack: err.stack,
      name: err.name
    });

    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}