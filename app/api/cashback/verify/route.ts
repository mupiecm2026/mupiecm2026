import { NextRequest, NextResponse } from 'next/server';
import { CashbackService } from '../../../../lib/services/cashback-service';
import { logger } from '../../../../lib/utils/logger';


export async function POST(request: NextRequest, context: any) {
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