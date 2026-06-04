/**
 * Asigna ref a registros existentes (USR-…, ORD-2026-…, etc.)
 *
 * Uso:
 *   cd tanku-backend && npx tsx scripts/backfill-entity-refs.ts
 *   npx tsx scripts/backfill-entity-refs.ts --dry-run
 */

import { prisma } from '../src/config/database';
import { formatEntityRef } from '../src/shared/utils/entity-ref';

const DRY_RUN = process.argv.includes('--dry-run');

async function backfillUsers() {
  const rows = await prisma.user.findMany({
    where: { ref: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (rows.length === 0) {
    console.log('  USR: nada que rellenar');
    return;
  }
  console.log(`  USR: ${rows.length} filas…`);
  let seq = 0;
  for (const row of rows) {
    seq++;
    const ref = formatEntityRef('USR', seq);
    if (DRY_RUN) {
      console.log(`    [dry] ${row.id} -> ${ref}`);
      continue;
    }
    await prisma.user.update({ where: { id: row.id }, data: { ref } });
  }
  if (!DRY_RUN && seq > 0) {
    await prisma.entityRefSequence.upsert({
      where: { entityType_year: { entityType: 'USR', year: 0 } },
      create: { entityType: 'USR', year: 0, lastValue: seq },
      update: { lastValue: seq },
    });
  }
}

async function backfillByYear(
  prefix: 'ORD' | 'RCL' | 'PST' | 'EVT',
  table: 'order' | 'supportCase' | 'poster' | 'event'
) {
  const model = {
    order: prisma.order,
    supportCase: prisma.supportCase,
    poster: prisma.poster,
    event: prisma.event,
  }[table];

  const rows = await model.findMany({
    where: { ref: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true, createdAt: true },
  });

  if (rows.length === 0) {
    console.log(`  ${prefix}: nada que rellenar`);
    return;
  }

  const byYear = new Map<number, typeof rows>();
  for (const row of rows) {
    const y = row.createdAt.getUTCFullYear();
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y)!.push(row);
  }

  console.log(`  ${prefix}: ${rows.length} filas en ${byYear.size} año(s)…`);

  for (const [year, yearRows] of byYear.entries()) {
    let seq = 0;
    for (const row of yearRows) {
      seq++;
      const ref = formatEntityRef(prefix, seq, year);
      if (DRY_RUN) {
        console.log(`    [dry] ${row.id} -> ${ref}`);
        continue;
      }
      await model.update({ where: { id: row.id }, data: { ref } });
    }
    if (!DRY_RUN && seq > 0) {
      await prisma.entityRefSequence.upsert({
        where: { entityType_year: { entityType: prefix, year } },
        create: { entityType: prefix, year, lastValue: seq },
        update: { lastValue: seq },
      });
    }
  }
}

async function backfillGlobalSimple(
  prefix: 'WLS' | 'GFT',
  table: 'wishList' | 'stalkerGift'
) {
  const model = {
    wishList: prisma.wishList,
    stalkerGift: prisma.stalkerGift,
  }[table];

  const rows = await model.findMany({
    where: { ref: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  if (rows.length === 0) {
    console.log(`  ${prefix}: nada que rellenar`);
    return;
  }

  console.log(`  ${prefix}: ${rows.length} filas…`);
  let seq = 0;
  for (const row of rows) {
    seq++;
    const ref = formatEntityRef(prefix, seq);
    if (DRY_RUN) {
      console.log(`    [dry] ${row.id} -> ${ref}`);
      continue;
    }
    await model.update({ where: { id: row.id }, data: { ref } });
  }
  if (!DRY_RUN && seq > 0) {
    await prisma.entityRefSequence.upsert({
      where: { entityType_year: { entityType: prefix, year: 0 } },
      create: { entityType: prefix, year: 0, lastValue: seq },
      update: { lastValue: seq },
    });
  }
}

async function main() {
  console.log(DRY_RUN ? '🔍 Dry run (sin escribir)\n' : '📝 Backfill entity refs\n');

  await backfillUsers();
  await backfillByYear('ORD', 'order');
  await backfillByYear('RCL', 'supportCase');
  await backfillByYear('PST', 'poster');
  await backfillByYear('EVT', 'event');
  await backfillGlobalSimple('WLS', 'wishList');
  await backfillGlobalSimple('GFT', 'stalkerGift');

  console.log(DRY_RUN ? '\n✅ Dry run terminado' : '\n✅ Backfill completado');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
