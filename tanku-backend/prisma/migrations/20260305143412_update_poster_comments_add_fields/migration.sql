-- AlterTable: poster_comments - Agregar campos para soft delete y ocultar comentarios
DO $$ 
BEGIN
    -- Cambiar content a TEXT si no es ya TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'poster_comments' 
        AND column_name = 'content'
        AND data_type != 'text'
    ) THEN
        ALTER TABLE "poster_comments" ALTER COLUMN "content" TYPE TEXT;
        RAISE NOTICE 'Columna content cambiada a TEXT exitosamente';
    ELSE
        RAISE NOTICE 'Columna content ya es TEXT o no existe, omitiendo';
    END IF;
    
    -- deleted_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'poster_comments' 
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE "poster_comments" ADD COLUMN "deleted_at" TIMESTAMP(3);
        RAISE NOTICE 'Columna deleted_at agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna deleted_at ya existe, omitiendo';
    END IF;
    
    -- hidden_by_owner
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'poster_comments' 
        AND column_name = 'hidden_by_owner'
    ) THEN
        ALTER TABLE "poster_comments" ADD COLUMN "hidden_by_owner" BOOLEAN NOT NULL DEFAULT false;
        RAISE NOTICE 'Columna hidden_by_owner agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna hidden_by_owner ya existe, omitiendo';
    END IF;
END $$;

-- CreateIndex: poster_comments_deleted_at_idx
CREATE INDEX IF NOT EXISTS "poster_comments_deleted_at_idx" ON "poster_comments"("deleted_at");

-- CreateIndex: poster_comments_hidden_by_owner_idx
CREATE INDEX IF NOT EXISTS "poster_comments_hidden_by_owner_idx" ON "poster_comments"("hidden_by_owner");

-- CreateIndex: poster_comments_is_active_idx (si no existe)
CREATE INDEX IF NOT EXISTS "poster_comments_is_active_idx" ON "poster_comments"("is_active");

