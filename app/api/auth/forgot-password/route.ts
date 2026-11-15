export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import crypto from 'crypto';

const GENERIC_MESSAGE = 'If that email is registered, a reset link has been sent.';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const ip = getClientIp(request);
    if (!rateLimit(`forgot-password:${ip}`, 5, 15 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many requests, please try again later' }, { status: 429 });
    }
    if (!rateLimit(`forgot-password:email:${String(email).toLowerCase()}`, 3, 15 * 60 * 1000)) {
      return NextResponse.json({ message: GENERIC_MESSAGE });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ message: GENERIC_MESSAGE });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: expiry },
    });

    if (process.env.NODE_ENV !== 'production') {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      console.log(`Password reset URL: ${baseUrl}/reset-password?token=${token}`);
    }

    return NextResponse.json({ message: GENERIC_MESSAGE });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
