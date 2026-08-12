export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CURRENCIES, convertPrice } from '@/lib/currency';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const { currency } = await request.json();
    if (!currency || !CURRENCIES[currency]) {
      return NextResponse.json({ error: 'Invalid currency' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const oldCurrency = user.currency;
    if (oldCurrency !== currency) {
      // Convert all item prices from old currency to new currency
      const items = await prisma.item.findMany({ where: { userId }, select: { id: true, price: true } });
      for (const item of items) {
        if (item.price != null) {
          const newPrice = convertPrice(item.price, oldCurrency, currency);
          await prisma.item.update({
            where: { id: item.id },
            data: { price: Math.round(newPrice * 100) / 100 },
          });
        }
      }
      await prisma.user.update({ where: { id: userId }, data: { currency } });
    }

    return NextResponse.json({ currency });
  } catch (error: any) {
    console.error('Change currency error:', error);
    return NextResponse.json({ error: 'Failed to change currency' }, { status: 500 });
  }
}
