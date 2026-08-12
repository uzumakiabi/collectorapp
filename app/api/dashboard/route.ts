export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const items = await prisma.item.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });

    const totalItems = items.length;
    const totalValue = items.reduce((sum, it) => sum + (it.price ?? 0), 0);

    // Recent additions (last 5)
    const recentAdditions = items.slice(0, 5).map(it => ({
      id: it.id,
      name: it.name,
      price: it.price,
      category: it.category?.name ?? '',
      createdAt: it.createdAt,
    }));

    // Collection value over time (cumulative by month)
    const valueByMonth = new Map<string, number>();
    const sortedByDate = [...items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    let running = 0;
    for (const it of sortedByDate) {
      const d = new Date(it.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      running += it.price ?? 0;
      valueByMonth.set(key, running);
    }
    const valueOverTime = Array.from(valueByMonth.entries()).map(([month, value]) => ({ month, value: Math.round(value * 100) / 100 }));

    // Value by category
    const valueByCategoryMap = new Map<string, number>();
    for (const it of items) {
      const name = it.category?.name ?? 'Uncategorized';
      valueByCategoryMap.set(name, (valueByCategoryMap.get(name) ?? 0) + (it.price ?? 0));
    }
    const valueByCategory = Array.from(valueByCategoryMap.entries())
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);

    // Item count by category
    const countByCategoryMap = new Map<string, number>();
    for (const it of items) {
      const name = it.category?.name ?? 'Uncategorized';
      countByCategoryMap.set(name, (countByCategoryMap.get(name) ?? 0) + 1);
    }
    const countByCategory = Array.from(countByCategoryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Most valuable items (top 5)
    const mostValuable = [...items]
      .filter(it => it.price != null)
      .sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
      .slice(0, 5)
      .map(it => ({ id: it.id, name: it.name, price: it.price, category: it.category?.name ?? '' }));

    return NextResponse.json({
      totalItems,
      totalValue: Math.round(totalValue * 100) / 100,
      recentAdditions,
      valueOverTime,
      valueByCategory,
      countByCategory,
      mostValuable,
    });
  } catch (error: any) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 });
  }
}
