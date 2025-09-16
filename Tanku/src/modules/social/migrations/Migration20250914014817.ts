import { Migration } from '@mikro-orm/migrations';

export class Migration20250914014817 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "chat_message_status" drop constraint if exists "chat_message_status_message_id_customer_id_unique";`);
    this.addSql(`alter table if exists "chat_conversation" drop constraint if exists "chat_conversation_conversation_type_relation_id_unique";`);
    this.addSql(`create table if not exists "chat_conversation" ("id" text not null, "conversation_type" text not null default 'direct', "relation_id" text not null, "title" text null, "created_by" text not null, "last_message_id" text null, "last_message_at" timestamptz null, "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "chat_conversation_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_chat_conversation_deleted_at" ON "chat_conversation" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_chat_conversation_created_by" ON "chat_conversation" (created_by) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_chat_conversation_conversation_type" ON "chat_conversation" (conversation_type) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_chat_conversation_relation_id" ON "chat_conversation" (relation_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_chat_conversation_conversation_type_relation_id_unique" ON "chat_conversation" (conversation_type, relation_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_chat_conversation_last_message_at" ON "chat_conversation" (last_message_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_chat_conversation_is_active" ON "chat_conversation" (is_active) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "chat_message" ("id" text not null, "conversation_id" text not null, "sender_id" text not null, "content" text not null, "message_type" text not null default 'text', "file_url" text null, "reply_to_id" text null, "is_edited" boolean not null default false, "edited_at" timestamptz null, "is_deleted" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "chat_message_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_chat_message_deleted_at" ON "chat_message" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_chat_message_conversation_id" ON "chat_message" (conversation_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_chat_message_sender_id" ON "chat_message" (sender_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_chat_message_created_at" ON "chat_message" (created_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_chat_message_reply_to_id" ON "chat_message" (reply_to_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_chat_message_is_deleted" ON "chat_message" (is_deleted) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "chat_message_status" ("id" text not null, "message_id" text not null, "customer_id" text not null, "status" text not null default 'sent', "status_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "chat_message_status_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_chat_message_status_deleted_at" ON "chat_message_status" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_chat_message_status_message_id" ON "chat_message_status" (message_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_chat_message_status_customer_id" ON "chat_message_status" (customer_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_chat_message_status_message_id_customer_id_unique" ON "chat_message_status" (message_id, customer_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_chat_message_status_status" ON "chat_message_status" (status) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_chat_message_status_status_at" ON "chat_message_status" (status_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "chat_conversation" cascade;`);

    this.addSql(`drop table if exists "chat_message" cascade;`);

    this.addSql(`drop table if exists "chat_message_status" cascade;`);
  }

}
