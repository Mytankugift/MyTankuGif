/*
  Warnings:

  - You are about to drop the column `alias` on the `stalker_gifts` table. All the data in the column will be lost.
  - You are about to drop the column `contact_methods` on the `stalker_gifts` table. All the data in the column will be lost.
  - You are about to drop the column `customer_giver_id` on the `stalker_gifts` table. All the data in the column will be lost.
  - You are about to drop the column `customer_recipient_id` on the `stalker_gifts` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `stalker_gifts` table. All the data in the column will be lost.
  - You are about to drop the column `first_name` on the `stalker_gifts` table. All the data in the column will be lost.
  - You are about to drop the column `message` on the `stalker_gifts` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `stalker_gifts` table. All the data in the column will be lost.
  - You are about to drop the column `products` on the `stalker_gifts` table. All the data in the column will be lost.
  - You are about to drop the column `recipient_name` on the `stalker_gifts` table. All the data in the column will be lost.
  - You are about to drop the column `total_amount` on the `stalker_gifts` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[unique_link]` on the table `stalker_gifts` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[link_token]` on the table `stalker_gifts` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `product_id` to the `stalker_gifts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sender_alias` to the `stalker_gifts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sender_id` to the `stalker_gifts` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "StalkerGiftStatus" AS ENUM ('CREATED', 'PAID', 'WAITING_ACCEPTANCE', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "stalker_gifts" DROP CONSTRAINT "stalker_gifts_customer_giver_id_fkey";

-- DropForeignKey
ALTER TABLE "stalker_gifts" DROP CONSTRAINT "stalker_gifts_customer_recipient_id_fkey";

-- AlterTable
ALTER TABLE "stalker_gifts" DROP COLUMN "alias",
DROP COLUMN "contact_methods",
DROP COLUMN "customer_giver_id",
DROP COLUMN "customer_recipient_id",
DROP COLUMN "email",
DROP COLUMN "first_name",
DROP COLUMN "message",
DROP COLUMN "phone",
DROP COLUMN "products",
DROP COLUMN "recipient_name",
DROP COLUMN "total_amount",
ADD COLUMN     "accepted_at" TIMESTAMP(3),
ADD COLUMN     "estado" "StalkerGiftStatus" NOT NULL DEFAULT 'CREATED',
ADD COLUMN     "external_receiver_data" JSONB,
ADD COLUMN     "link_token" TEXT,
ADD COLUMN     "payment_id" TEXT,
ADD COLUMN     "product_id" TEXT NOT NULL,
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "receiver_id" TEXT,
ADD COLUMN     "sender_alias" TEXT NOT NULL,
ADD COLUMN     "sender_id" TEXT NOT NULL,
ADD COLUMN     "sender_message" TEXT,
ADD COLUMN     "unique_link" TEXT,
ADD COLUMN     "variant_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "stalker_gifts_unique_link_key" ON "stalker_gifts"("unique_link");

-- CreateIndex
CREATE UNIQUE INDEX "stalker_gifts_link_token_key" ON "stalker_gifts"("link_token");

-- CreateIndex
CREATE INDEX "stalker_gifts_sender_id_idx" ON "stalker_gifts"("sender_id");

-- CreateIndex
CREATE INDEX "stalker_gifts_receiver_id_idx" ON "stalker_gifts"("receiver_id");

-- CreateIndex
CREATE INDEX "stalker_gifts_unique_link_idx" ON "stalker_gifts"("unique_link");

-- CreateIndex
CREATE INDEX "stalker_gifts_link_token_idx" ON "stalker_gifts"("link_token");

-- CreateIndex
CREATE INDEX "stalker_gifts_estado_idx" ON "stalker_gifts"("estado");

-- AddForeignKey
ALTER TABLE "stalker_gifts" ADD CONSTRAINT "stalker_gifts_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stalker_gifts" ADD CONSTRAINT "stalker_gifts_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stalker_gifts" ADD CONSTRAINT "stalker_gifts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stalker_gifts" ADD CONSTRAINT "stalker_gifts_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
