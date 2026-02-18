-- AlterTable: conversation_participants
-- Hacer user_id nullable y agregar deleted_user_email

DO $$ 
BEGIN
    -- Agregar columna deleted_user_email si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'conversation_participants' 
        AND column_name = 'deleted_user_email'
    ) THEN
        ALTER TABLE "conversation_participants" ADD COLUMN "deleted_user_email" TEXT;
    END IF;
    
    -- Hacer user_id nullable si no lo es
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'conversation_participants' 
        AND column_name = 'user_id'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE "conversation_participants" ALTER COLUMN "user_id" DROP NOT NULL;
    END IF;
END $$;

-- Actualizar foreign key de conversation_participants para SetNull
DO $$
BEGIN
    -- Eliminar constraint existente si existe
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public'
        AND table_name = 'conversation_participants'
        AND constraint_name = 'conversation_participants_user_id_fkey'
    ) THEN
        ALTER TABLE "conversation_participants" DROP CONSTRAINT "conversation_participants_user_id_fkey";
    END IF;
    
    -- Recrear constraint con onDelete SetNull
    ALTER TABLE "conversation_participants" 
    ADD CONSTRAINT "conversation_participants_user_id_fkey" 
    FOREIGN KEY ("user_id") 
    REFERENCES "users"("id") 
    ON DELETE SET NULL ON UPDATE CASCADE;
END $$;

-- AlterTable: messages
-- Hacer sender_id nullable y agregar deleted_sender_email

DO $$ 
BEGIN
    -- Agregar columna deleted_sender_email si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'messages' 
        AND column_name = 'deleted_sender_email'
    ) THEN
        ALTER TABLE "messages" ADD COLUMN "deleted_sender_email" TEXT;
    END IF;
    
    -- Hacer sender_id nullable si no lo es
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'messages' 
        AND column_name = 'sender_id'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE "messages" ALTER COLUMN "sender_id" DROP NOT NULL;
    END IF;
END $$;

-- Actualizar foreign key de messages para SetNull
DO $$
BEGIN
    -- Eliminar constraint existente si existe
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public'
        AND table_name = 'messages'
        AND constraint_name = 'messages_sender_id_fkey'
    ) THEN
        ALTER TABLE "messages" DROP CONSTRAINT "messages_sender_id_fkey";
    END IF;
    
    -- Recrear constraint con onDelete SetNull
    ALTER TABLE "messages" 
    ADD CONSTRAINT "messages_sender_id_fkey" 
    FOREIGN KEY ("sender_id") 
    REFERENCES "users"("id") 
    ON DELETE SET NULL ON UPDATE CASCADE;
END $$;

-- AlterTable: orders
-- Hacer user_id nullable y agregar deleted_user_email

DO $$ 
BEGIN
    -- Agregar columna deleted_user_email si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'orders' 
        AND column_name = 'deleted_user_email'
    ) THEN
        ALTER TABLE "orders" ADD COLUMN "deleted_user_email" TEXT;
    END IF;
    
    -- Hacer user_id nullable si no lo es
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'orders' 
        AND column_name = 'user_id'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE "orders" ALTER COLUMN "user_id" DROP NOT NULL;
    END IF;
END $$;

-- Actualizar foreign key de orders para SetNull
DO $$
BEGIN
    -- Eliminar constraint existente si existe
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public'
        AND table_name = 'orders'
        AND constraint_name = 'orders_user_id_fkey'
    ) THEN
        ALTER TABLE "orders" DROP CONSTRAINT "orders_user_id_fkey";
    END IF;
    
    -- Recrear constraint con onDelete SetNull
    ALTER TABLE "orders" 
    ADD CONSTRAINT "orders_user_id_fkey" 
    FOREIGN KEY ("user_id") 
    REFERENCES "users"("id") 
    ON DELETE SET NULL ON UPDATE CASCADE;
END $$;

-- AlterTable: stalker_gifts
-- Hacer sender_id nullable y agregar deleted_sender_email y deleted_receiver_email

DO $$ 
BEGIN
    -- Agregar columna deleted_sender_email si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'stalker_gifts' 
        AND column_name = 'deleted_sender_email'
    ) THEN
        ALTER TABLE "stalker_gifts" ADD COLUMN "deleted_sender_email" TEXT;
    END IF;
    
    -- Agregar columna deleted_receiver_email si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'stalker_gifts' 
        AND column_name = 'deleted_receiver_email'
    ) THEN
        ALTER TABLE "stalker_gifts" ADD COLUMN "deleted_receiver_email" TEXT;
    END IF;
    
    -- Hacer sender_id nullable si no lo es
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'stalker_gifts' 
        AND column_name = 'sender_id'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE "stalker_gifts" ALTER COLUMN "sender_id" DROP NOT NULL;
    END IF;
END $$;

-- Actualizar foreign keys de stalker_gifts para SetNull
DO $$
BEGIN
    -- Eliminar constraint de sender si existe
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public'
        AND table_name = 'stalker_gifts'
        AND constraint_name = 'stalker_gifts_sender_id_fkey'
    ) THEN
        ALTER TABLE "stalker_gifts" DROP CONSTRAINT "stalker_gifts_sender_id_fkey";
    END IF;
    
    -- Recrear constraint de sender con onDelete SetNull
    ALTER TABLE "stalker_gifts" 
    ADD CONSTRAINT "stalker_gifts_sender_id_fkey" 
    FOREIGN KEY ("sender_id") 
    REFERENCES "users"("id") 
    ON DELETE SET NULL ON UPDATE CASCADE;
    
    -- Eliminar constraint de receiver si existe
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public'
        AND table_name = 'stalker_gifts'
        AND constraint_name = 'stalker_gifts_receiver_id_fkey'
    ) THEN
        ALTER TABLE "stalker_gifts" DROP CONSTRAINT "stalker_gifts_receiver_id_fkey";
    END IF;
    
    -- Recrear constraint de receiver con onDelete SetNull (si receiver_id existe)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'stalker_gifts' 
        AND column_name = 'receiver_id'
    ) THEN
        ALTER TABLE "stalker_gifts" 
        ADD CONSTRAINT "stalker_gifts_receiver_id_fkey" 
        FOREIGN KEY ("receiver_id") 
        REFERENCES "users"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

