-- Backfill dropi_id desde handle (suffix -{dropiId}) para productos existentes
UPDATE products
SET dropi_id = (regexp_match(handle, '-([0-9]+)$'))[1]::integer
WHERE dropi_id IS NULL
  AND handle ~ '-[0-9]+$'
  AND (regexp_match(handle, '-([0-9]+)$'))[1] IS NOT NULL;
