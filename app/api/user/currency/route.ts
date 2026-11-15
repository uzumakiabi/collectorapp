export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CURRENCIES, getLiveRates } from '@/lib/currency';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;

    const { currency } = await request.json();
    if (!currency || !CURRENCIES[currency]) {
      return NextResponse.json({ error: 'Invalid currency' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const oldCurrency = user.currency;
    if (oldCurrency !== currency) {
      // Convert all item prices from old currency to new currency using live rates
      const items = await prisma.item.findMany({ where: { userId }, select: { id: true, price: true, purchasePrice: true } });
      const rates = await getLiveRates();
      const fromRate = rates[oldCurrency] ?? CURRENCIES[oldCurrency]?.rate ?? 1;
      const toRate = rates[currency] ?? CURRENCIES[currency]?.rate ?? 1;
      const ratio = toRate / fromRate;
      const convert = (value: number) => Math.round((value * ratio) * 100) / 100;
      const updates = items
        .filter((item) => item.price != null || item.purchasePrice != null)
        .map((item) => prisma.item.update({
          where: { id: item.id },
          data: {
            price: item.price != null ? convert(item.price) : null,
            purchasePrice: item.purchasePrice != null ? convert(item.purchasePrice) : null,
          },
        }));
      await prisma.$transaction([
        ...updates,
        prisma.$executeRaw`UPDATE "PriceHistory" SET "price" = ROUND(("price" * ${ratio})::numeric, 2) WHERE "itemId" IN (SELECT "id" FROM "Item" WHERE "userId" = ${userId})`,
        prisma.user.update({ where: { id: userId }, data: { currency } }),
      ]);
    }

    return NextResponse.json({ currency });
  } catch (error: any) {
    console.error('Change currency error:', error);
    return NextResponse.json({ error: 'Failed to change currency' }, { status: 500 });
  }
}
