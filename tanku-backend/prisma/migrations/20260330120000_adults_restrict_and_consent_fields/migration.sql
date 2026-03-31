-- Restricción +18 en categoría y producto; consentimiento menores en personal_information

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'categories'
          AND column_name = 'restrict_to_adults'
    ) THEN
        ALTER TABLE "categories" ADD COLUMN "restrict_to_adults" BOOLEAN NOT NULL DEFAULT false;
        RAISE NOTICE 'Columna categories.restrict_to_adults agregada';
    ELSE
        RAISE NOTICE 'Columna categories.restrict_to_adults ya existe, omitiendo';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'products'
          AND column_name = 'restrict_to_adults'
    ) THEN
        ALTER TABLE "products" ADD COLUMN "restrict_to_adults" BOOLEAN NOT NULL DEFAULT false;
        RAISE NOTICE 'Columna products.restrict_to_adults agregada';
    ELSE
        RAISE NOTICE 'Columna products.restrict_to_adults ya existe, omitiendo';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'personal_information'
          AND column_name = 'minor_acknowledged_at'
    ) THEN
        ALTER TABLE "personal_information" ADD COLUMN "minor_acknowledged_at" TIMESTAMP(3);
        RAISE NOTICE 'Columna personal_information.minor_acknowledged_at agregada';
    ELSE
        RAISE NOTICE 'Columna personal_information.minor_acknowledged_at ya existe, omitiendo';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'personal_information'
          AND column_name = 'accepted_terms_version'
    ) THEN
        ALTER TABLE "personal_information" ADD COLUMN "accepted_terms_version" TEXT;
        RAISE NOTICE 'Columna personal_information.accepted_terms_version agregada';
    ELSE
        RAISE NOTICE 'Columna personal_information.accepted_terms_version ya existe, omitiendo';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'personal_information'
          AND column_name = 'minor_disclaimer_version'
    ) THEN
        ALTER TABLE "personal_information" ADD COLUMN "minor_disclaimer_version" TEXT;
        RAISE NOTICE 'Columna personal_information.minor_disclaimer_version agregada';
    ELSE
        RAISE NOTICE 'Columna personal_information.minor_disclaimer_version ya existe, omitiendo';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "categories_restrict_to_adults_idx" ON "categories"("restrict_to_adults");
CREATE INDEX IF NOT EXISTS "products_restrict_to_adults_idx" ON "products"("restrict_to_adults");
