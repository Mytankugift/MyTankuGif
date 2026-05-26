import {
  maxVariantStock,
  productMeetsStockThreshold,
  stockEligibilityReason,
  variantMeetsStockThreshold,
} from './catalog-stock-policy';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const variants = [
  { warehouseVariants: [{ stock: 25 }] },
  { warehouseVariants: [{ stock: 10 }] },
];
assert(!productMeetsStockThreshold(variants), 'suma 35 no debe activar producto');
assert(maxVariantStock(variants) === 25, 'max variant');
assert(stockEligibilityReason(variants).includes('25'), 'reason max');

const oneUnit = [{ warehouseVariants: [{ stock: 1 }] }];
assert(!variantMeetsStockThreshold(1), '1 unidad no cumple');
assert(!productMeetsStockThreshold(oneUnit), '1 unidad producto no cumple');

const sellable = [{ warehouseVariants: [{ stock: 30 }] }];
assert(productMeetsStockThreshold(sellable), '30 en una variante cumple');

console.log('catalog-stock-policy.selftest: ok');
