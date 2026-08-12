export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    await prisma.user.update({ where: { id: userId }, data: { onboarded: true } });
    return NextResponse.json({ onboarded: true });
  } catch (error: any) {
    console.error('Mark onboarded error:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
