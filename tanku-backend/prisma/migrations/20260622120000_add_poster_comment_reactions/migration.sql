-- Reacciones por usuario en comentarios (like/unlike, una por persona)

CREATE TABLE IF NOT EXISTS "poster_comment_reactions" (
    "id" TEXT NOT NULL,
    "comment_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "reaction_type" TEXT NOT NULL DEFAULT 'like',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "poster_comment_reactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "poster_comment_reactions_comment_id_customer_id_key"
    ON "poster_comment_reactions"("comment_id", "customer_id");

CREATE INDEX IF NOT EXISTS "poster_comment_reactions_comment_id_idx"
    ON "poster_comment_reactions"("comment_id");

CREATE INDEX IF NOT EXISTS "poster_comment_reactions_customer_id_idx"
    ON "poster_comment_reactions"("customer_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'poster_comment_reactions_comment_id_fkey'
    ) THEN
        ALTER TABLE "poster_comment_reactions"
            ADD CONSTRAINT "poster_comment_reactions_comment_id_fkey"
            FOREIGN KEY ("comment_id") REFERENCES "poster_comments"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'poster_comment_reactions_customer_id_fkey'
    ) THEN
        ALTER TABLE "poster_comment_reactions"
            ADD CONSTRAINT "poster_comment_reactions_customer_id_fkey"
            FOREIGN KEY ("customer_id") REFERENCES "users"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
