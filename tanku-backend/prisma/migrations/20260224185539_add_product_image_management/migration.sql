-- Add custom_image_urls column to products table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'products' 
        AND column_name = 'custom_image_urls'
    ) THEN
        ALTER TABLE "products" ADD COLUMN "custom_image_urls" TEXT[] DEFAULT ARRAY[]::TEXT[];
        RAISE NOTICE 'Columna custom_image_urls agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna custom_image_urls ya existe, omitiendo';
    END IF;
END $$;

-- Add hidden_images column to products table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'products' 
        AND column_name = 'hidden_images'
    ) THEN
        ALTER TABLE "products" ADD COLUMN "hidden_images" TEXT[] DEFAULT ARRAY[]::TEXT[];
        RAISE NOTICE 'Columna hidden_images agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna hidden_images ya existe, omitiendo';
    END IF;
END $$;

