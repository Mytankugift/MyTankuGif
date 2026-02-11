-- AddForeignKey: StoriesUser -> Product
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'stories_user_product_id_fkey'
    ) THEN
        ALTER TABLE "stories_user" 
        ADD CONSTRAINT "stories_user_product_id_fkey" 
        FOREIGN KEY ("product_id") 
        REFERENCES "products"("id") 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
        RAISE NOTICE 'Foreign key stories_user_product_id_fkey agregado exitosamente';
    ELSE
        RAISE NOTICE 'Foreign key stories_user_product_id_fkey ya existe, omitiendo';
    END IF;
END $$;

