/*
  Warnings:

  - You are about to drop the column `personalInformationId` on the `user_category_interests` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "user_category_interests" DROP CONSTRAINT "user_category_interests_personalInformationId_fkey";

-- AlterTable
ALTER TABLE "user_category_interests" DROP COLUMN "personalInformationId";

-- CreateTable
CREATE TABLE "friends" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "friend_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "friends_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "friends_user_id_status_idx" ON "friends"("user_id", "status");

-- CreateIndex
CREATE INDEX "friends_friend_id_status_idx" ON "friends"("friend_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "friends_user_id_friend_id_key" ON "friends"("user_id", "friend_id");

-- AddForeignKey
ALTER TABLE "friends" ADD CONSTRAINT "friends_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friends" ADD CONSTRAINT "friends_friend_id_fkey" FOREIGN KEY ("friend_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
