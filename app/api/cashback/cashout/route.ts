import { NextRequest, NextResponse } from 'next/server';
import { CashbackService } from '../../../../lib/services/cashback-service';
import { logger } from '../../../../lib/utils/logger';


type CashoutBody = {
  code: string;
  pixKey: string;
};

export async function POST(request: NextRequest, context: any) {
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