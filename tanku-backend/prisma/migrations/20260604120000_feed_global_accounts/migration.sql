-- Feed global accounts: cuentas visibles para todos en feed e historias

CREATE TABLE IF NOT EXISTS "feed_global_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "feed_global_accounts_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'feed_global_accounts_user_id_key'
    ) THEN
        CREATE UNIQUE INDEX "feed_global_accounts_user_id_key" ON "feed_global_accounts"("user_id");
        RAISE NOTICE 'Unique index feed_global_accounts_user_id_key created';
    ELSE
        RAISE NOTICE 'Unique index feed_global_accounts_user_id_key already exists, skipping';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'feed_global_accounts_user_id_fkey'
    ) THEN
        ALTER TABLE "feed_global_accounts"
        ADD CONSTRAINT "feed_global_accounts_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'FK feed_global_accounts_user_id_fkey created';
    ELSE
        RAISE NOTICE 'FK feed_global_accounts_user_id_fkey already exists, skipping';
    END IF;
END $$;
