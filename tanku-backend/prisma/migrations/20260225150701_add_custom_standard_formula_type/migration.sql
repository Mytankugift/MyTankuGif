-- Add CUSTOM_STANDARD to PriceFormulaType enum
DO $$ 
BEGIN
    -- Verificar si el enum existe
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PriceFormulaType') THEN
        -- Verificar si CUSTOM_STANDARD ya existe en el enum
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'CUSTOM_STANDARD' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PriceFormulaType')
        ) THEN
            -- Agregar el valor al enum
            BEGIN
                ALTER TYPE "PriceFormulaType" ADD VALUE 'CUSTOM_STANDARD';
                RAISE NOTICE 'Valor CUSTOM_STANDARD agregado al enum PriceFormulaType exitosamente';
            EXCEPTION
                WHEN OTHERS THEN
                    -- Si falla por cualquier razón, verificar si ya existe
                    IF EXISTS (
                        SELECT 1 FROM pg_enum 
                        WHERE enumlabel = 'CUSTOM_STANDARD' 
                        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PriceFormulaType')
                    ) THEN
                        RAISE NOTICE 'Valor CUSTOM_STANDARD ya existe en PriceFormulaType, omitiendo';
                    ELSE
                        RAISE;
                    END IF;
            END;
        ELSE
            RAISE NOTICE 'Valor CUSTOM_STANDARD ya existe en PriceFormulaType, omitiendo';
        END IF;
    ELSE
        RAISE NOTICE 'Enum PriceFormulaType no existe, no se puede agregar CUSTOM_STANDARD';
    END IF;
END $$;

