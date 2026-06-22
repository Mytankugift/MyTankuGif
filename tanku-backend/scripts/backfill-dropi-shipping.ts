/**
 * Backfill de costos Dropi + corrección de orders.total contaminado.
 *
 * 1) Rellena order_items.dropi_shipping_amount y dropi_supplier_cost desde dropi_webhook_data.
 * 2) Corrige orders.total/shipping_total inflados con discounted_amount.
 *
 * Uso:
 *   npm run backfill:dropi-shipping            # aplica cambios
 *   npm run backfill:dropi-shipping -- --dry   # solo reporta
 */

import { prisma } from '../src/config/database';

const DRY_RUN = process.argv.includes('--dry');

function extractShippingAmount(data: unknown): number | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const obj = data as Record<string, any>;

  if (typeof obj.shipping_amount === 'number') {
    return Math.round(obj.shipping_amount);
  }

  if (Array.isArray(obj.orderdetails)) {
    const sum = obj.orderdetails.reduce((acc: number, d: any) => {
      const v = typeof d?.shipping_amount === 'number' ? d.shipping_amount : 0;
      return acc + v;
    }, 0);
    if (sum > 0) return Math.round(sum);
  }

  return null;
}

function extractSupplierCost(data: unknown): number | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const obj = data as Record<string, any>;

  if (Array.isArray(obj.orderdetails) && obj.orderdetails.length > 0) {
    const sum = obj.orderdetails.reduce((acc: number, d: any) => {
      const v = typeof d?.supplier_price === 'number' ? d.supplier_price : 0;
      return acc + v;
    }, 0);
    if (sum > 0) return Math.round(sum);
  }

  return null;
}

async function backfillDropiCosts(): Promise<void> {
  console.log('\n📦 Backfill dropi_shipping_amount + dropi_supplier_cost\n');

  const items = await prisma.orderItem.findMany({
    where: {
      dropiOrderId: { not: null },
      OR: [
        { dropiShippingAmount: null },
        { dropiShippingAmount: 0 },
        { dropiSupplierCost: null },
        { dropiSupplierCost: 0 },
      ],
    },
    select: {
      id: true,
      dropiWebhookData: true,
      dropiShippingAmount: true,
      dropiSupplierCost: true,
    },
  });

  console.log(`   Candidatos: ${items.length}`);

  let updatedShipping = 0;
  let updatedSupplier = 0;
  let skipped = 0;

  for (const item of items) {
    if (item.dropiWebhookData == null) {
      skipped++;
      continue;
    }

    const shipping = extractShippingAmount(item.dropiWebhookData);
    const supplier = extractSupplierCost(item.dropiWebhookData);
    const patch: { dropiShippingAmount?: number; dropiSupplierCost?: number } = {};

    if (shipping != null && shipping > 0 && !item.dropiShippingAmount) {
      patch.dropiShippingAmount = shipping;
      updatedShipping++;
    }
    if (supplier != null && supplier > 0 && !item.dropiSupplierCost) {
      patch.dropiSupplierCost = supplier;
      updatedSupplier++;
    }

    if (Object.keys(patch).length === 0) {
      skipped++;
      continue;
    }

    if (!DRY_RUN) {
      await prisma.orderItem.update({ where: { id: item.id }, data: patch });
    }
  }

  console.log(
    `   ✅ Envío: ${updatedShipping} · Proveedor: ${updatedSupplier} · Sin dato: ${skipped}${DRY_RUN ? ' (dry-run)' : ''}`
  );
}

async function fixContaminatedTotals(): Promise<void> {
  console.log('\n💰 Corrección orders.total contaminado\n');

  const orders = await prisma.order.findMany({
    select: { id: true, total: true, subtotal: true, shippingTotal: true },
  });

  const toFix = orders.filter((o) => o.subtotal > 0 && o.total !== o.subtotal);
  console.log(`   Órdenes con total != subtotal: ${toFix.length} / ${orders.length}`);
  for (const o of toFix.slice(0, 10)) {
    console.log(
      `   - ${o.id}: total ${o.total} → ${o.subtotal} (shipping_total ${o.shippingTotal} → 0)`
    );
  }
  if (toFix.length > 10) console.log(`   … y ${toFix.length - 10} más`);

  if (!DRY_RUN) {
    for (const o of toFix) {
      await prisma.order.update({
        where: { id: o.id },
        data: { total: o.subtotal, shippingTotal: 0 },
      });
    }
    console.log(`   ✅ Corregidas: ${toFix.length}`);
  } else {
    console.log('   (dry-run, no se escribió)');
  }
}

async function main(): Promise<void> {
  console.log(`🔧 Backfill costos Dropi ${DRY_RUN ? '(DRY-RUN)' : '(APLICANDO)'}`);
  try {
    await backfillDropiCosts();
    await fixContaminatedTotals();
    console.log('\n✅ Backfill completado.\n');
  } catch (err) {
    console.error('\n❌ Error:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
