/*
  Warnings:

  - You are about to drop the column `dropi_order_number` on the `order_items` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "order_items_dropi_order_number_idx";

-- AlterTable
ALTER TABLE "order_items" DROP COLUMN "dropi_order_number",
ADD COLUMN     "dropi_dropshipper_win" INTEGER DEFAULT 0;
