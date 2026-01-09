/*
  Warnings:

  - You are about to drop the `onboarding_status` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "onboarding_status" DROP CONSTRAINT "onboarding_status_user_id_fkey";

-- AlterTable
ALTER TABLE "personal_information" ADD COLUMN     "birth_date" TIMESTAMP(3),
ADD COLUMN     "metadata" JSONB;

-- DropTable
DROP TABLE "onboarding_status";

-- CreateTable
CREATE TABLE "user_category_interests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "personalInformationId" TEXT,

    CONSTRAINT "user_category_interests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_category_interests_user_id_idx" ON "user_category_interests"("user_id");

-- CreateIndex
CREATE INDEX "user_category_interests_category_id_idx" ON "user_category_interests"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_category_interests_user_id_category_id_key" ON "user_category_interests"("user_id", "category_id");

-- AddForeignKey
ALTER TABLE "user_category_interests" ADD CONSTRAINT "user_category_interests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_category_interests" ADD CONSTRAINT "user_category_interests_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_category_interests" ADD CONSTRAINT "user_category_interests_personalInformationId_fkey" FOREIGN KEY ("personalInformationId") REFERENCES "personal_information"("id") ON DELETE SET NULL ON UPDATE CASCADE;
