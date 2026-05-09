import { NextResponse } from 'next/server';
import { logger } from '../../../../lib/utils/logger';

export async function GET() {
  try {
    const codes : any = [];
    logger.info('Cashback list requested');
    return NextResponse.json(codes);
  } catch (error : any) {
    logger.error('Cashback list failed', { error: error.message });
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}