-- CreateTable
CREATE TABLE "posters" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "image_url" TEXT NOT NULL,
    "video_url" TEXT,
    "likes_count" INTEGER NOT NULL DEFAULT 0,
    "comments_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poster_reactions" (
    "id" TEXT NOT NULL,
    "poster_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "reaction_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "poster_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poster_comments" (
    "id" TEXT NOT NULL,
    "poster_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parent_id" TEXT,
    "likes_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "poster_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stories_user" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER NOT NULL DEFAULT 24,
    "views_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stories_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_files" (
    "id" TEXT NOT NULL,
    "story_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_size" INTEGER,
    "duration" INTEGER,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "posters_customer_id_idx" ON "posters"("customer_id");

-- CreateIndex
CREATE INDEX "posters_is_active_idx" ON "posters"("is_active");

-- CreateIndex
CREATE INDEX "poster_reactions_poster_id_idx" ON "poster_reactions"("poster_id");

-- CreateIndex
CREATE INDEX "poster_reactions_customer_id_idx" ON "poster_reactions"("customer_id");

-- CreateIndex
CREATE INDEX "poster_reactions_reaction_type_idx" ON "poster_reactions"("reaction_type");

-- CreateIndex
CREATE UNIQUE INDEX "poster_reactions_poster_id_customer_id_key" ON "poster_reactions"("poster_id", "customer_id");

-- CreateIndex
CREATE INDEX "poster_comments_poster_id_idx" ON "poster_comments"("poster_id");

-- CreateIndex
CREATE INDEX "poster_comments_customer_id_idx" ON "poster_comments"("customer_id");

-- CreateIndex
CREATE INDEX "poster_comments_parent_id_idx" ON "poster_comments"("parent_id");

-- CreateIndex
CREATE INDEX "poster_comments_created_at_idx" ON "poster_comments"("created_at");

-- CreateIndex
CREATE INDEX "stories_user_customer_id_idx" ON "stories_user"("customer_id");

-- CreateIndex
CREATE INDEX "stories_user_expires_at_idx" ON "stories_user"("expires_at");

-- CreateIndex
CREATE INDEX "stories_user_is_active_idx" ON "stories_user"("is_active");

-- CreateIndex
CREATE INDEX "story_files_story_id_idx" ON "story_files"("story_id");

-- CreateIndex
CREATE INDEX "story_files_file_type_idx" ON "story_files"("file_type");

-- CreateIndex
CREATE INDEX "story_files_story_id_order_index_idx" ON "story_files"("story_id", "order_index");

-- AddForeignKey
ALTER TABLE "posters" ADD CONSTRAINT "posters_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poster_reactions" ADD CONSTRAINT "poster_reactions_poster_id_fkey" FOREIGN KEY ("poster_id") REFERENCES "posters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poster_reactions" ADD CONSTRAINT "poster_reactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poster_comments" ADD CONSTRAINT "poster_comments_poster_id_fkey" FOREIGN KEY ("poster_id") REFERENCES "posters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poster_comments" ADD CONSTRAINT "poster_comments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poster_comments" ADD CONSTRAINT "poster_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "poster_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stories_user" ADD CONSTRAINT "stories_user_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_files" ADD CONSTRAINT "story_files_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
