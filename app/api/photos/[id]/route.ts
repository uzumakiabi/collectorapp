export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { dataUrlToBuffer } from '@/lib/photo-processing';

const IMMUTABLE_CACHE = 'private, max-age=31536000, immutable';
const SHORT_CACHE = 'private, max-age=3600';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;
    const size = new URL(request.url).searchParams.get('size');

    const photo = await prisma.itemPhoto.findFirst({
      where: { id: params.id, item: { userId } },
      select: { data: true, thumbnail: true, contentType: true },
    });
    if (!photo) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const wantThumb = size === 'thumb';
    const useThumb = wantThumb && !!photo.thumbnail;
    const source = useThumb ? photo.thumbnail : photo.data;
    if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { buffer, mime } = dataUrlToBuffer(source);
    const contentType = mime ?? photo.contentType ?? 'application/octet-stream';
    const cacheControl = useThumb || (!wantThumb && contentType === 'image/webp') ? IMMUTABLE_CACHE : SHORT_CACHE;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
      },
    });
  } catch (error: any) {
    console.error('Get photo error:', error);
    return NextResponse.json({ error: 'Failed to fetch photo' }, { status: 500 });
  }
}
