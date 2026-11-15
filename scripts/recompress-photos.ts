import { PrismaClient } from '@prisma/client';
import { processPhoto } from '../lib/photo-processing';

const prisma = new PrismaClient();
const BATCH_SIZE = 25;

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const vacuum = args.includes('--vacuum');

function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function main() {
  if (args.includes('--help')) {
    console.log('Recompress stored item photos to WebP (1000px full, 300px thumbnail).');
    console.log('');
    console.log('Usage: npm run photos:recompress -- [--apply] [--vacuum]');
    console.log('');
    console.log('  --apply    write the recompressed photos (default is a dry run)');
    console.log('  --vacuum   run VACUUM (FULL, ANALYZE) on "ItemPhoto" after applying');
    return;
  }

  let cursor: string | undefined;
  let rows = 0;
  let processed = 0;
  let failed = 0;
  let bytesBefore = 0;
  let bytesAfter = 0;

  while (true) {
    const batch = await prisma.itemPhoto.findMany({
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      select: { id: true, data: true, thumbnail: true, contentType: true },
    });
    if (batch.length === 0) break;
    cursor = batch[batch.length - 1].id;

    for (const row of batch) {
      rows += 1;
      if (!row.data) continue;
      const result = await processPhoto({ data: row.data, contentType: row.contentType });
      if (!result.thumbnail) {
        failed += 1;
        continue;
      }
      bytesBefore += row.data.length + (row.thumbnail?.length ?? 0);
      bytesAfter += result.data.length + result.thumbnail.length;
      processed += 1;
      if (apply) {
        await prisma.itemPhoto.update({
          where: { id: row.id },
          data: { data: result.data, contentType: result.contentType, thumbnail: result.thumbnail },
        });
      }
    }

    console.log(`Batch: ${rows} rows scanned, ${processed} processed, ${failed} failed, ${formatMb(bytesBefore)} -> ${formatMb(bytesAfter)}`);
  }

  const saved = bytesBefore - bytesAfter;
  const percent = bytesBefore > 0 ? (saved / bytesBefore) * 100 : 0;

  console.log('');
  console.log(`${apply ? 'Applied' : 'Dry run'} summary`);
  console.log(`  Rows scanned: ${rows}`);
  console.log(`  Rows processed: ${processed}`);
  console.log(`  Rows failed: ${failed}`);
  console.log(`  Before: ${formatMb(bytesBefore)}`);
  console.log(`  After: ${formatMb(bytesAfter)}`);
  console.log(`  Saved: ${formatMb(saved)} (${percent.toFixed(1)}%)`);

  if (apply && vacuum) {
    console.log('Running VACUUM (FULL, ANALYZE) on "ItemPhoto" - this locks the table briefly.');
    await prisma.$executeRawUnsafe('VACUUM (FULL, ANALYZE) "ItemPhoto"');
    console.log('Vacuum complete.');
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('Recompress failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
