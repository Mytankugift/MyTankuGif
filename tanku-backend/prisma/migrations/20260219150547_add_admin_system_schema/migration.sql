-- CreateEnum: AdminRole
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AdminRole') THEN
        CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'PRODUCT_MANAGER');
        RAISE NOTICE 'Enum AdminRole creado exitosamente';
    ELSE
        RAISE NOTICE 'Enum AdminRole ya existe, omitiendo';
    END IF;
END $$;

-- CreateEnum: PriceFormulaType
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PriceFormulaType') THEN
        CREATE TYPE "PriceFormulaType" AS ENUM ('PERCENTAGE', 'FIXED', 'MIN_MARGIN');
        RAISE NOTICE 'Enum PriceFormulaType creado exitosamente';
    ELSE
        RAISE NOTICE 'Enum PriceFormulaType ya existe, omitiendo';
    END IF;
END $$;

-- CreateTable: admin_users
CREATE TABLE IF NOT EXISTS "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: admin_users_email_unique
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'admin_users_email_key'
    ) THEN
        CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");
        RAISE NOTICE 'Índice único admin_users_email_key creado exitosamente';
    ELSE
        RAISE NOTICE 'Índice único admin_users_email_key ya existe, omitiendo';
    END IF;
END $$;

-- AlterTable: products - Agregar campos de bloqueo
DO $$ 
BEGIN
    -- locked_by_admin
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'products' 
        AND column_name = 'locked_by_admin'
    ) THEN
        ALTER TABLE "products" ADD COLUMN "locked_by_admin" BOOLEAN NOT NULL DEFAULT false;
        RAISE NOTICE 'Columna locked_by_admin agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna locked_by_admin ya existe, omitiendo';
    END IF;
    
    -- locked_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'products' 
        AND column_name = 'locked_at'
    ) THEN
        ALTER TABLE "products" ADD COLUMN "locked_at" TIMESTAMP(3);
        RAISE NOTICE 'Columna locked_at agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna locked_at ya existe, omitiendo';
    END IF;
    
    -- locked_by
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'products' 
        AND column_name = 'locked_by'
    ) THEN
        ALTER TABLE "products" ADD COLUMN "locked_by" TEXT;
        RAISE NOTICE 'Columna locked_by agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna locked_by ya existe, omitiendo';
    END IF;
    
    -- price_formula_type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'products' 
        AND column_name = 'price_formula_type'
    ) THEN
        ALTER TABLE "products" ADD COLUMN "price_formula_type" "PriceFormulaType";
        RAISE NOTICE 'Columna price_formula_type agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna price_formula_type ya existe, omitiendo';
    END IF;
    
    -- price_formula_value
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'products' 
        AND column_name = 'price_formula_value'
    ) THEN
        ALTER TABLE "products" ADD COLUMN "price_formula_value" JSONB;
        RAISE NOTICE 'Columna price_formula_value agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna price_formula_value ya existe, omitiendo';
    END IF;
END $$;

-- AlterTable: product_variants - Agregar campo tanku_price_locked
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'product_variants' 
        AND column_name = 'tanku_price_locked'
    ) THEN
        ALTER TABLE "product_variants" ADD COLUMN "tanku_price_locked" BOOLEAN NOT NULL DEFAULT false;
        RAISE NOTICE 'Columna tanku_price_locked agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna tanku_price_locked ya existe, omitiendo';
    END IF;
END $$;

-- AlterTable: categories - Agregar campos de bloqueo y fórmula
DO $$ 
BEGIN
    -- image_url
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'categories' 
        AND column_name = 'image_url'
    ) THEN
        ALTER TABLE "categories" ADD COLUMN "image_url" TEXT;
        RAISE NOTICE 'Columna image_url agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna image_url ya existe, omitiendo';
    END IF;
    
    -- blocked
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'categories' 
        AND column_name = 'blocked'
    ) THEN
        ALTER TABLE "categories" ADD COLUMN "blocked" BOOLEAN NOT NULL DEFAULT false;
        RAISE NOTICE 'Columna blocked agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna blocked ya existe, omitiendo';
    END IF;
    
    -- blocked_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'categories' 
        AND column_name = 'blocked_at'
    ) THEN
        ALTER TABLE "categories" ADD COLUMN "blocked_at" TIMESTAMP(3);
        RAISE NOTICE 'Columna blocked_at agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna blocked_at ya existe, omitiendo';
    END IF;
    
    -- blocked_by
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'categories' 
        AND column_name = 'blocked_by'
    ) THEN
        ALTER TABLE "categories" ADD COLUMN "blocked_by" TEXT;
        RAISE NOTICE 'Columna blocked_by agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna blocked_by ya existe, omitiendo';
    END IF;
    
    -- default_price_formula_type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'categories' 
        AND column_name = 'default_price_formula_type'
    ) THEN
        ALTER TABLE "categories" ADD COLUMN "default_price_formula_type" "PriceFormulaType";
        RAISE NOTICE 'Columna default_price_formula_type agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna default_price_formula_type ya existe, omitiendo';
    END IF;
    
    -- default_price_formula_value
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'categories' 
        AND column_name = 'default_price_formula_value'
    ) THEN
        ALTER TABLE "categories" ADD COLUMN "default_price_formula_value" JSONB;
        RAISE NOTICE 'Columna default_price_formula_value agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna default_price_formula_value ya existe, omitiendo';
    END IF;
END $$;

-- AddForeignKey: products_locked_by_fkey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'products_locked_by_fkey'
    ) THEN
        ALTER TABLE "products" 
        ADD CONSTRAINT "products_locked_by_fkey" 
        FOREIGN KEY ("locked_by") 
        REFERENCES "admin_users"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
        RAISE NOTICE 'Foreign key products_locked_by_fkey agregado exitosamente';
    ELSE
        RAISE NOTICE 'Foreign key products_locked_by_fkey ya existe, omitiendo';
    END IF;
END $$;

-- AddForeignKey: categories_blocked_by_fkey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'categories_blocked_by_fkey'
    ) THEN
        ALTER TABLE "categories" 
        ADD CONSTRAINT "categories_blocked_by_fkey" 
        FOREIGN KEY ("blocked_by") 
        REFERENCES "admin_users"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
        RAISE NOTICE 'Foreign key categories_blocked_by_fkey agregado exitosamente';
    ELSE
        RAISE NOTICE 'Foreign key categories_blocked_by_fkey ya existe, omitiendo';
    END IF;
END $$;

