import { NextRequest, NextResponse } from 'next/server';
import { authService } from '../../../../lib/services/auth/auth-service';
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

export async function GET(request: NextRequest) {
  const session = await requireMasterSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const codes: any = [];
    logger.info('Cashback list requested', { user: session.email });
    return NextResponse.json(codes);
  } catch (error : any) {
    logger.error('Cashback list failed', { error: error.message });
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}