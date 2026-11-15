export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getLiveRates } from '@/lib/currency';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ rates: await getLiveRates() });
  } catch (error: any) {
    console.error('Get rates error:', error);
    return NextResponse.json({ error: 'Failed to load rates' }, { status: 500 });
  }
}
