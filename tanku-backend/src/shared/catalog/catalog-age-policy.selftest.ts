/**
 * Ejecutar: npx tsx src/shared/catalog/catalog-age-policy.selftest.ts
 */
import assert from 'assert';
import { AgeRestrictedError } from '../errors/AppError';
import {
  assertProductViewableForUser,
  getAgeInYears,
  isProductBlockedForMinor,
  isUserMinorForPolicy,
  viewerCannotSeeAdultCatalog,
} from './catalog-age-policy';

function y(yearsAgo: number): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - yearsAgo);
  return d;
}

// Menor / mayor
assert.strictEqual(isUserMinorForPolicy(y(17)), true);
assert.strictEqual(isUserMinorForPolicy(y(18)), false);
assert.strictEqual(isUserMinorForPolicy(null), true);

// Regla única
assert.strictEqual(isProductBlockedForMinor({ restrictToAdults: false }, { restrictToAdults: true }), true);
assert.strictEqual(isProductBlockedForMinor({ restrictToAdults: true }, { restrictToAdults: false }), true);
assert.strictEqual(isProductBlockedForMinor({ restrictToAdults: false }, { restrictToAdults: false }), false);
assert.strictEqual(isProductBlockedForMinor({ restrictToAdults: false }, null), false);

// Visitante
assert.strictEqual(viewerCannotSeeAdultCatalog(false, undefined), true);
assert.strictEqual(viewerCannotSeeAdultCatalog(true, y(30)), false);

// assert
assert.throws(
  () =>
    assertProductViewableForUser(
      { restrictToAdults: true },
      { restrictToAdults: false },
      true,
      y(17)
    ),
  AgeRestrictedError
);

assert.doesNotThrow(() =>
  assertProductViewableForUser({ restrictToAdults: true }, { restrictToAdults: false }, true, y(20))
);

assert.throws(
  () =>
    assertProductViewableForUser(
      { restrictToAdults: true },
      { restrictToAdults: false },
      false,
      undefined
    ),
  AgeRestrictedError
);

assert.doesNotThrow(() =>
  assertProductViewableForUser({ restrictToAdults: false }, { restrictToAdults: false }, false, undefined)
);

const ageAbout10 = getAgeInYears(y(10));
assert.ok(ageAbout10 >= 9 && ageAbout10 <= 10);

console.log('catalog-age-policy.selftest: OK');
