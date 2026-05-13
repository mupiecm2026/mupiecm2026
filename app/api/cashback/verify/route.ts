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

export async function POST(request: NextRequest, context: any) {
  const session = await requireMasterSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const cashbackService = new CashbackService(context.env);

  try {
    const body = await request.json();
    const { codes }: any = body;

    const results = await cashbackService.verifyCodes(codes);

    logger.info('Cashback codes verified', {
      codesCount: codes?.length ?? 0
    });

    return NextResponse.json({ success: true, results });

  } catch (error) {
    logger.error('Cashback verification failed', {
      error: (error as Error).message
    });

    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}