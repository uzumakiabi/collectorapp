const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
const MAX_PHOTOS = 3;
const MAX_BYTES = 5 * 1024 * 1024;

export function validatePhotos(photos: unknown): string | null {
  if (photos === undefined || photos === null) return null;
  if (!Array.isArray(photos)) return 'Photos must be an array';
  if (photos.length > MAX_PHOTOS) return 'At most 3 photos are allowed';

  for (const photo of photos) {
    if (!photo || typeof photo !== 'object' || Array.isArray(photo)) return 'Invalid photo';
    const { contentType, data } = photo as { contentType?: unknown; data?: unknown };

    if (contentType !== undefined) {
      if (typeof contentType !== 'string' || !contentType.startsWith('image/')) {
        return 'Unsupported photo type';
      }
    }

    if (typeof data !== 'string') return 'Invalid photo data';

    let payload = data;
    const match = data.match(/^data:([^;,]*)(;[^,]*)?,/);
    if (match) {
      if (!ALLOWED_TYPES.includes(match[1])) return 'Unsupported photo type';
      payload = data.slice(match[0].length);
    }

    if ((payload.length * 3) / 4 > MAX_BYTES) return 'Photo is too large';
  }

  return null;
}
