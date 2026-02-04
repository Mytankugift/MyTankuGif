-- Template para migraciones futuras
-- Usar IF EXISTS / IF NOT EXISTS para evitar errores

-- ============================================
-- AGREGAR COLUMNA
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'nombre_tabla' 
        AND column_name = 'nombre_columna'
    ) THEN
        ALTER TABLE "nombre_tabla" ADD COLUMN "nombre_columna" TEXT;
        RAISE NOTICE 'Columna nombre_columna agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna nombre_columna ya existe, omitiendo';
    END IF;
END $$;

-- ============================================
-- CREAR ÍNDICE
-- ============================================
CREATE INDEX IF NOT EXISTS "nombre_indice" ON "nombre_tabla"("columna");

-- ============================================
-- CREAR ÍNDICE ÚNICO
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'nombre_indice_unico'
    ) THEN
        CREATE UNIQUE INDEX "nombre_indice_unico" ON "nombre_tabla"("columna");
        RAISE NOTICE 'Índice único creado exitosamente';
    ELSE
        RAISE NOTICE 'Índice único ya existe, omitiendo';
    END IF;
END $$;

-- ============================================
-- AGREGAR CONSTRAINT
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'nombre_constraint'
    ) THEN
        ALTER TABLE "nombre_tabla" ADD CONSTRAINT "nombre_constraint" UNIQUE ("columna");
        RAISE NOTICE 'Constraint agregado exitosamente';
    ELSE
        RAISE NOTICE 'Constraint ya existe, omitiendo';
    END IF;
END $$;

-- ============================================
-- CREAR TABLA
-- ============================================
CREATE TABLE IF NOT EXISTS "nombre_tabla" (
    "id" TEXT NOT NULL,
    "campo1" TEXT,
    "campo2" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "nombre_tabla_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- CREAR ENUM
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'nombre_enum') THEN
        CREATE TYPE "nombre_enum" AS ENUM ('valor1', 'valor2', 'valor3');
        RAISE NOTICE 'Enum creado exitosamente';
    ELSE
        RAISE NOTICE 'Enum ya existe, omitiendo';
    END IF;
END $$;

-- ============================================
-- AGREGAR FOREIGN KEY
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'nombre_tabla_columna_fkey'
    ) THEN
        ALTER TABLE "nombre_tabla" 
        ADD CONSTRAINT "nombre_tabla_columna_fkey" 
        FOREIGN KEY ("columna") 
        REFERENCES "tabla_referenciada"("id") 
        ON DELETE CASCADE;
        RAISE NOTICE 'Foreign key agregado exitosamente';
    ELSE
        RAISE NOTICE 'Foreign key ya existe, omitiendo';
    END IF;
END $$;

-- ============================================
-- ELIMINAR COLUMNA (con verificación)
-- ============================================
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'nombre_tabla' 
        AND column_name = 'nombre_columna'
    ) THEN
        ALTER TABLE "nombre_tabla" DROP COLUMN "nombre_columna";
        RAISE NOTICE 'Columna eliminada exitosamente';
    ELSE
        RAISE NOTICE 'Columna no existe, omitiendo';
    END IF;
END $$;

-- ============================================
-- MODIFICAR TIPO DE COLUMNA
-- ============================================
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'nombre_tabla' 
        AND column_name = 'nombre_columna'
        AND data_type = 'TEXT'  -- tipo actual
    ) THEN
        ALTER TABLE "nombre_tabla" 
        ALTER COLUMN "nombre_columna" TYPE INTEGER USING "nombre_columna"::INTEGER;
        RAISE NOTICE 'Tipo de columna modificado exitosamente';
    ELSE
        RAISE NOTICE 'Columna no existe o ya tiene el tipo correcto, omitiendo';
    END IF;
END $$;

