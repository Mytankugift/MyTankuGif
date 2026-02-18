-- AlterTable: user_profiles
-- Agregar columna allow_public_wishlists_when_private

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles' 
        AND column_name = 'allow_public_wishlists_when_private'
    ) THEN
        ALTER TABLE "user_profiles" ADD COLUMN "allow_public_wishlists_when_private" BOOLEAN NOT NULL DEFAULT false;
        RAISE NOTICE 'Columna allow_public_wishlists_when_private agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna allow_public_wishlists_when_private ya existe, omitiendo';
    END IF;
END $$;

