-- Migration: 20260210162449_add_story_type_fields
-- Agregar campos para historias de wishlist: storyType, wishlistId, productId, variantId
-- Usa IF EXISTS / IF NOT EXISTS para evitar errores en producción

-- ============================================
-- CREAR ENUM
-- ============================================

-- CreateEnum: StoryType
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StoryType') THEN
        CREATE TYPE "StoryType" AS ENUM ('NORMAL', 'WISHLIST');
        RAISE NOTICE 'Enum StoryType creado exitosamente';
    ELSE
        RAISE NOTICE 'Enum StoryType ya existe, omitiendo';
    END IF;
END $$;

-- ============================================
-- AGREGAR COLUMNAS A stories_user
-- ============================================

-- Agregar columna story_type
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'stories_user' 
        AND column_name = 'story_type'
    ) THEN
        ALTER TABLE "stories_user" ADD COLUMN "story_type" "StoryType" NOT NULL DEFAULT 'NORMAL';
        RAISE NOTICE 'Columna story_type agregada a stories_user exitosamente';
    ELSE
        RAISE NOTICE 'Columna story_type ya existe en stories_user, omitiendo';
    END IF;
END $$;

-- Agregar columna wishlist_id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'stories_user' 
        AND column_name = 'wishlist_id'
    ) THEN
        ALTER TABLE "stories_user" ADD COLUMN "wishlist_id" TEXT;
        RAISE NOTICE 'Columna wishlist_id agregada a stories_user exitosamente';
    ELSE
        RAISE NOTICE 'Columna wishlist_id ya existe en stories_user, omitiendo';
    END IF;
END $$;

-- Agregar columna product_id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'stories_user' 
        AND column_name = 'product_id'
    ) THEN
        ALTER TABLE "stories_user" ADD COLUMN "product_id" TEXT;
        RAISE NOTICE 'Columna product_id agregada a stories_user exitosamente';
    ELSE
        RAISE NOTICE 'Columna product_id ya existe en stories_user, omitiendo';
    END IF;
END $$;

-- Agregar columna variant_id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'stories_user' 
        AND column_name = 'variant_id'
    ) THEN
        ALTER TABLE "stories_user" ADD COLUMN "variant_id" TEXT;
        RAISE NOTICE 'Columna variant_id agregada a stories_user exitosamente';
    ELSE
        RAISE NOTICE 'Columna variant_id ya existe en stories_user, omitiendo';
    END IF;
END $$;

-- ============================================
-- CREAR ÍNDICES
-- ============================================

-- CreateIndex: stories_user.story_type
CREATE INDEX IF NOT EXISTS "stories_user_story_type_idx" ON "stories_user"("story_type");

-- CreateIndex: stories_user.wishlist_id
CREATE INDEX IF NOT EXISTS "stories_user_wishlist_id_idx" ON "stories_user"("wishlist_id");

-- CreateIndex: stories_user.product_id
CREATE INDEX IF NOT EXISTS "stories_user_product_id_idx" ON "stories_user"("product_id");

