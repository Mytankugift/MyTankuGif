-- Add STANDARD to PriceFormulaType enum
DO $$ 
BEGIN
    -- Verificar si el enum existe
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PriceFormulaType') THEN
        -- Verificar si STANDARD ya existe en el enum
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'STANDARD' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PriceFormulaType')
        ) THEN
            -- Agregar el valor al enum
            -- Nota: ALTER TYPE ADD VALUE funciona en PostgreSQL 9.1+ dentro de DO blocks
            -- Si el valor ya existe, simplemente no se agregará (no lanza error)
            BEGIN
                ALTER TYPE "PriceFormulaType" ADD VALUE 'STANDARD';
                RAISE NOTICE 'Valor STANDARD agregado al enum PriceFormulaType exitosamente';
            EXCEPTION
                WHEN OTHERS THEN
                    -- Si falla por cualquier razón, verificar si ya existe
                    IF EXISTS (
                        SELECT 1 FROM pg_enum 
                        WHERE enumlabel = 'STANDARD' 
                        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PriceFormulaType')
                    ) THEN
                        RAISE NOTICE 'Valor STANDARD ya existe en PriceFormulaType, omitiendo';
                    ELSE
                        RAISE;
                    END IF;
            END;
        ELSE
            RAISE NOTICE 'Valor STANDARD ya existe en PriceFormulaType, omitiendo';
        END IF;
    ELSE
        RAISE NOTICE 'Enum PriceFormulaType no existe, creándolo con todos los valores';
        CREATE TYPE "PriceFormulaType" AS ENUM ('STANDARD', 'PERCENTAGE', 'FIXED', 'MIN_MARGIN');
        RAISE NOTICE 'Enum PriceFormulaType creado exitosamente';
    END IF;
END $$;

-- Remove tanku_price_locked column from product_variants
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'product_variants' 
        AND column_name = 'tanku_price_locked'
    ) THEN
        ALTER TABLE "product_variants" DROP COLUMN "tanku_price_locked";
        RAISE NOTICE 'Columna tanku_price_locked eliminada exitosamente';
    ELSE
        RAISE NOTICE 'Columna tanku_price_locked no existe, omitiendo';
    END IF;
END $$;

-- CreateTable: price_formulas
CREATE TABLE IF NOT EXISTS "price_formulas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PriceFormulaType" NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_formulas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: price_formulas_name_unique
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'price_formulas_name_key'
    ) THEN
        CREATE UNIQUE INDEX "price_formulas_name_key" ON "price_formulas"("name");
        RAISE NOTICE 'Índice único price_formulas_name_key creado exitosamente';
    ELSE
        RAISE NOTICE 'Índice único price_formulas_name_key ya existe, omitiendo';
    END IF;
END $$;

