-- AlterTable: Add gift-related fields to user_profiles
ALTER TABLE "user_profiles" ADD COLUMN "allow_gift_shipping" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "user_profiles" ADD COLUMN "use_main_address_for_gifts" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Add isGiftAddress to addresses
ALTER TABLE "addresses" ADD COLUMN "is_gift_address" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Add gift fields to carts
ALTER TABLE "carts" ADD COLUMN "gift_recipient_id" TEXT;
ALTER TABLE "carts" ADD COLUMN "is_gift_cart" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex: Add index for gift_recipient_id in carts
CREATE INDEX "carts_gift_recipient_id_idx" ON "carts"("gift_recipient_id");

-- AlterTable: Add gift fields to orders
ALTER TABLE "orders" ADD COLUMN "is_gift_order" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "orders" ADD COLUMN "gift_sender_id" TEXT;
ALTER TABLE "orders" ADD COLUMN "gift_recipient_id" TEXT;

-- CreateIndex: Add indexes for gift fields in orders
CREATE INDEX "orders_gift_sender_id_idx" ON "orders"("gift_sender_id");
CREATE INDEX "orders_gift_recipient_id_idx" ON "orders"("gift_recipient_id");

