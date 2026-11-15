import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prismaMock } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prismaMock: { itemPhoto: { findFirst: vi.fn() } },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

import { GET } from '@/app/api/photos/[id]/route';

const THUMB = 'data:image/webp;base64,dGh1bWI=';
const FULL = 'data:image/jpeg;base64,ZnVsbA==';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/photos/[id]', () => {
  it('returns 401 without a session', async () => {
    getServerSession.mockResolvedValue(null);

    const response = await GET(new Request('http://localhost/api/photos/photo-1?size=thumb'), { params: { id: 'photo-1' } });

    expect(response.status).toBe(401);
    expect(prismaMock.itemPhoto.findFirst).not.toHaveBeenCalled();
  });

  it('serves the thumbnail to the owner with an immutable cache header', async () => {
    getServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    prismaMock.itemPhoto.findFirst.mockResolvedValue({ data: FULL, thumbnail: THUMB, contentType: 'image/webp' });

    const response = await GET(new Request('http://localhost/api/photos/photo-1?size=thumb'), { params: { id: 'photo-1' } });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/webp');
    expect(response.headers.get('Cache-Control')).toBe('private, max-age=31536000, immutable');
    expect(prismaMock.itemPhoto.findFirst).toHaveBeenCalledWith({
      where: { id: 'photo-1', item: { userId: 'user-1' } },
      select: { data: true, thumbnail: true, contentType: true },
    });
  });

  it('returns 404 for a photo owned by another user', async () => {
    getServerSession.mockResolvedValue({ user: { id: 'user-2' } });
    prismaMock.itemPhoto.findFirst.mockResolvedValue(null);

    const response = await GET(new Request('http://localhost/api/photos/photo-1'), { params: { id: 'photo-1' } });

    expect(response.status).toBe(404);
  });
});
