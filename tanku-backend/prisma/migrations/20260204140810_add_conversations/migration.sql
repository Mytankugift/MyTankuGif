-- Migration: 20260204140810_add_conversations
-- Agregar tablas de conversaciones y mensajes para el sistema de chat
-- Usa IF EXISTS / IF NOT EXISTS para evitar errores en producción

-- ============================================
-- CREAR ENUMS
-- ============================================

-- CreateEnum: ConversationType
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConversationType') THEN
        CREATE TYPE "ConversationType" AS ENUM ('FRIENDS', 'STALKERGIFT');
        RAISE NOTICE 'Enum ConversationType creado exitosamente';
    ELSE
        RAISE NOTICE 'Enum ConversationType ya existe, omitiendo';
    END IF;
END $$;

-- CreateEnum: ConversationStatus
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConversationStatus') THEN
        CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'CLOSED');
        RAISE NOTICE 'Enum ConversationStatus creado exitosamente';
    ELSE
        RAISE NOTICE 'Enum ConversationStatus ya existe, omitiendo';
    END IF;
END $$;

-- CreateEnum: MessageType
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MessageType') THEN
        CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'FILE');
        RAISE NOTICE 'Enum MessageType creado exitosamente';
    ELSE
        RAISE NOTICE 'Enum MessageType ya existe, omitiendo';
    END IF;
END $$;

-- CreateEnum: MessageStatus
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MessageStatus') THEN
        CREATE TYPE "MessageStatus" AS ENUM ('SENT', 'DELIVERED', 'READ');
        RAISE NOTICE 'Enum MessageStatus creado exitosamente';
    ELSE
        RAISE NOTICE 'Enum MessageStatus ya existe, omitiendo';
    END IF;
END $$;

-- ============================================
-- CREAR TABLAS
-- ============================================

-- CreateTable: conversations
CREATE TABLE IF NOT EXISTS "conversations" (
    "id" TEXT NOT NULL,
    "type" "ConversationType" NOT NULL DEFAULT 'FRIENDS',
    "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: conversation_participants
CREATE TABLE IF NOT EXISTS "conversation_participants" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "alias" TEXT,
    "is_revealed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable: messages
CREATE TABLE IF NOT EXISTS "messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "sender_alias" TEXT,
    "content" TEXT NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "status" "MessageStatus" NOT NULL DEFAULT 'SENT',
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- CREAR ÍNDICES
-- ============================================

-- CreateIndex: conversations
CREATE INDEX IF NOT EXISTS "conversations_type_status_idx" ON "conversations"("type", "status");
CREATE INDEX IF NOT EXISTS "conversations_status_idx" ON "conversations"("status");

-- CreateIndex: conversation_participants
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'conversation_participants_conversation_id_user_id_key'
    ) THEN
        CREATE UNIQUE INDEX "conversation_participants_conversation_id_user_id_key" 
        ON "conversation_participants"("conversation_id", "user_id");
        RAISE NOTICE 'Índice único conversation_participants_conversation_id_user_id_key creado exitosamente';
    ELSE
        RAISE NOTICE 'Índice único conversation_participants_conversation_id_user_id_key ya existe, omitiendo';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "conversation_participants_conversation_id_idx" ON "conversation_participants"("conversation_id");
CREATE INDEX IF NOT EXISTS "conversation_participants_user_id_idx" ON "conversation_participants"("user_id");

-- CreateIndex: messages
CREATE INDEX IF NOT EXISTS "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");
CREATE INDEX IF NOT EXISTS "messages_sender_id_idx" ON "messages"("sender_id");
CREATE INDEX IF NOT EXISTS "messages_status_idx" ON "messages"("status");

-- ============================================
-- AGREGAR FOREIGN KEYS
-- ============================================

-- AddForeignKey: conversation_participants -> conversations
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'conversation_participants_conversation_id_fkey'
    ) THEN
        ALTER TABLE "conversation_participants" 
        ADD CONSTRAINT "conversation_participants_conversation_id_fkey" 
        FOREIGN KEY ("conversation_id") 
        REFERENCES "conversations"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Foreign key conversation_participants_conversation_id_fkey agregado exitosamente';
    ELSE
        RAISE NOTICE 'Foreign key conversation_participants_conversation_id_fkey ya existe, omitiendo';
    END IF;
END $$;

-- AddForeignKey: conversation_participants -> users
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'conversation_participants_user_id_fkey'
    ) THEN
        ALTER TABLE "conversation_participants" 
        ADD CONSTRAINT "conversation_participants_user_id_fkey" 
        FOREIGN KEY ("user_id") 
        REFERENCES "users"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Foreign key conversation_participants_user_id_fkey agregado exitosamente';
    ELSE
        RAISE NOTICE 'Foreign key conversation_participants_user_id_fkey ya existe, omitiendo';
    END IF;
END $$;

-- AddForeignKey: messages -> conversations
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'messages_conversation_id_fkey'
    ) THEN
        ALTER TABLE "messages" 
        ADD CONSTRAINT "messages_conversation_id_fkey" 
        FOREIGN KEY ("conversation_id") 
        REFERENCES "conversations"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Foreign key messages_conversation_id_fkey agregado exitosamente';
    ELSE
        RAISE NOTICE 'Foreign key messages_conversation_id_fkey ya existe, omitiendo';
    END IF;
END $$;

-- AddForeignKey: messages -> users
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'messages_sender_id_fkey'
    ) THEN
        ALTER TABLE "messages" 
        ADD CONSTRAINT "messages_sender_id_fkey" 
        FOREIGN KEY ("sender_id") 
        REFERENCES "users"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE;
        RAISE NOTICE 'Foreign key messages_sender_id_fkey agregado exitosamente';
    ELSE
        RAISE NOTICE 'Foreign key messages_sender_id_fkey ya existe, omitiendo';
    END IF;
END $$;

-- ============================================
-- ALTER TABLE: stalker_gifts
-- ============================================

-- Agregar columna conversation_id a stalker_gifts si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'stalker_gifts' 
        AND column_name = 'conversation_id'
    ) THEN
        ALTER TABLE "stalker_gifts" ADD COLUMN "conversation_id" TEXT;
        RAISE NOTICE 'Columna conversation_id agregada a stalker_gifts exitosamente';
    ELSE
        RAISE NOTICE 'Columna conversation_id ya existe en stalker_gifts, omitiendo';
    END IF;
END $$;

-- CreateIndex: stalker_gifts.conversation_id (único, pero nullable)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'stalker_gifts_conversation_id_key'
    ) THEN
        CREATE UNIQUE INDEX "stalker_gifts_conversation_id_key" 
        ON "stalker_gifts"("conversation_id") 
        WHERE "conversation_id" IS NOT NULL;
        RAISE NOTICE 'Índice único stalker_gifts_conversation_id_key creado exitosamente';
    ELSE
        RAISE NOTICE 'Índice único stalker_gifts_conversation_id_key ya existe, omitiendo';
    END IF;
END $$;

-- AddForeignKey: stalker_gifts -> conversations
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'stalker_gifts_conversation_id_fkey'
    ) THEN
        ALTER TABLE "stalker_gifts" 
        ADD CONSTRAINT "stalker_gifts_conversation_id_fkey" 
        FOREIGN KEY ("conversation_id") 
        REFERENCES "conversations"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
        RAISE NOTICE 'Foreign key stalker_gifts_conversation_id_fkey agregado exitosamente';
    ELSE
        RAISE NOTICE 'Foreign key stalker_gifts_conversation_id_fkey ya existe, omitiendo';
    END IF;
END $$;

