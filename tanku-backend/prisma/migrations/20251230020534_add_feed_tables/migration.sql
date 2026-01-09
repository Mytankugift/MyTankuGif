/*
  Warnings:

  - You are about to drop the column `address1` on the `addresses` table. All the data in the column will be lost.
  - You are about to drop the column `address2` on the `addresses` table. All the data in the column will be lost.
  - You are about to drop the column `order_id` on the `addresses` table. All the data in the column will be lost.
  - The `images` column on the `dropi_products` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `normalized_at` on the `dropi_raw_products` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[cart_id,variant_id]` on the table `cart_items` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[dropi_id]` on the table `categories` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[dropi_id,source]` on the table `dropi_raw_products` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `address_1` to the `addresses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `order_items` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DropiJobType" AS ENUM ('RAW', 'NORMALIZE', 'ENRICH', 'SYNC_PRODUCT', 'SYNC_STOCK');

-- CreateEnum
CREATE TYPE "DropiJobStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'FAILED');

-- DropForeignKey
ALTER TABLE "addresses" DROP CONSTRAINT "addresses_order_id_fkey";

-- DropIndex
DROP INDEX "addresses_order_id_key";

-- AlterTable
ALTER TABLE "addresses" DROP COLUMN "address1",
DROP COLUMN "address2",
DROP COLUMN "order_id",
ADD COLUMN     "address_1" TEXT NOT NULL,
ADD COLUMN     "detail" TEXT,
ADD COLUMN     "is_default_shipping" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "metadata" JSONB,
ALTER COLUMN "phone" DROP NOT NULL;

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "dropi_id" INTEGER;

-- AlterTable
ALTER TABLE "dropi_products" ADD COLUMN     "category_dropi_ids" JSONB,
ADD COLUMN     "description_synced_at" TIMESTAMP(3),
ADD COLUMN     "last_price_stock_sync_at" TIMESTAMP(3),
ADD COLUMN     "last_synced_at" TIMESTAMP(3),
ADD COLUMN     "main_image_s3_path" TEXT,
ADD COLUMN     "suggested_price" INTEGER,
DROP COLUMN "images",
ADD COLUMN     "images" JSONB;

-- AlterTable
ALTER TABLE "dropi_raw_products" DROP COLUMN "normalized_at",
ADD COLUMN     "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "dropi_order_id" INTEGER,
ADD COLUMN     "dropi_order_number" INTEGER,
ADD COLUMN     "dropi_shipping_cost" INTEGER DEFAULT 0,
ADD COLUMN     "dropi_status" TEXT,
ADD COLUMN     "final_price" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "email" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "is_stalker_gift" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "shipping_total" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "subtotal" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "transaction_id" TEXT;

-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "attributes" JSONB,
ADD COLUMN     "suggested_price" INTEGER;

-- CreateTable
CREATE TABLE "order_addresses" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "address_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dropi_jobs" (
    "id" TEXT NOT NULL,
    "type" "DropiJobType" NOT NULL,
    "status" "DropiJobStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "locked_by" TEXT,
    "locked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "dropi_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_ranking" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "item_type" TEXT NOT NULL,
    "global_score" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_ranking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_metrics" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "item_type" TEXT NOT NULL,
    "wishlist_count" INTEGER NOT NULL DEFAULT 0,
    "orders_count" INTEGER NOT NULL DEFAULT 0,
    "likes_count" INTEGER NOT NULL DEFAULT 0,
    "comments_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_addresses_order_id_idx" ON "order_addresses"("order_id");

-- CreateIndex
CREATE INDEX "order_addresses_address_id_idx" ON "order_addresses"("address_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_addresses_order_id_address_id_key" ON "order_addresses"("order_id", "address_id");

-- CreateIndex
CREATE INDEX "dropi_jobs_type_status_idx" ON "dropi_jobs"("type", "status");

-- CreateIndex
CREATE INDEX "dropi_jobs_status_idx" ON "dropi_jobs"("status");

-- CreateIndex
CREATE INDEX "dropi_jobs_locked_by_idx" ON "dropi_jobs"("locked_by");

-- CreateIndex
CREATE INDEX "global_ranking_global_score_created_at_idx" ON "global_ranking"("global_score", "created_at");

-- CreateIndex
CREATE INDEX "global_ranking_item_type_idx" ON "global_ranking"("item_type");

-- CreateIndex
CREATE UNIQUE INDEX "global_ranking_item_id_item_type_key" ON "global_ranking"("item_id", "item_type");

-- CreateIndex
CREATE INDEX "item_metrics_item_type_idx" ON "item_metrics"("item_type");

-- CreateIndex
CREATE UNIQUE INDEX "item_metrics_item_id_item_type_key" ON "item_metrics"("item_id", "item_type");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cart_id_variant_id_key" ON "cart_items"("cart_id", "variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_dropi_id_key" ON "categories"("dropi_id");

-- CreateIndex
CREATE INDEX "categories_dropi_id_idx" ON "categories"("dropi_id");

-- CreateIndex
CREATE INDEX "dropi_products_category_dropi_id_idx" ON "dropi_products"("category_dropi_id");

-- CreateIndex
CREATE INDEX "dropi_raw_products_dropi_id_idx" ON "dropi_raw_products"("dropi_id");

-- CreateIndex
CREATE INDEX "dropi_raw_products_source_idx" ON "dropi_raw_products"("source");

-- CreateIndex
CREATE INDEX "dropi_raw_products_synced_at_idx" ON "dropi_raw_products"("synced_at");

-- CreateIndex
CREATE UNIQUE INDEX "dropi_raw_products_dropi_id_source_key" ON "dropi_raw_products"("dropi_id", "source");

-- CreateIndex
CREATE INDEX "order_items_dropi_order_id_idx" ON "order_items"("dropi_order_id");

-- CreateIndex
CREATE INDEX "order_items_dropi_order_number_idx" ON "order_items"("dropi_order_number");

-- CreateIndex
CREATE INDEX "orders_user_id_idx" ON "orders"("user_id");

-- CreateIndex
CREATE INDEX "orders_email_idx" ON "orders"("email");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_payment_status_idx" ON "orders"("payment_status");

-- AddForeignKey
ALTER TABLE "order_addresses" ADD CONSTRAINT "order_addresses_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_addresses" ADD CONSTRAINT "order_addresses_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "addresses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_variants" ADD CONSTRAINT "warehouse_variants_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
