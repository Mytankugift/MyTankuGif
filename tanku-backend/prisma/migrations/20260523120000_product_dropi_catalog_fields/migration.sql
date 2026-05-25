-- Catálogo por favoritos Dropi: enlace dropiId y estado de catálogo en products
ALTER TABLE "products" ADD COLUMN "dropi_id" INTEGER;
ALTER TABLE "products" ADD COLUMN "in_dropi_catalog" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "products" ADD COLUMN "removed_from_catalog_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "products_dropi_id_key" ON "products"("dropi_id");
CREATE INDEX "products_in_dropi_catalog_idx" ON "products"("in_dropi_catalog");
CREATE INDEX "products_dropi_id_idx" ON "products"("dropi_id");
