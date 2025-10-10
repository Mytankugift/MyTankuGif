import { Migration } from '@mikro-orm/migrations';

export class Migration20251002215809 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "stalker_message_status" drop constraint if exists "stalker_message_status_message_id_customer_id_unique";`);
    this.addSql(`alter table if exists "stalker_chat_conversation" drop constraint if exists "stalker_chat_conversation_stalker_gift_id_unique";`);
    this.addSql(`create table if not exists "stalker_chat_conversation" ("id" text not null, "stalker_gift_id" text not null, "customer_giver_id" text not null, "customer_recipient_id" text not null, "is_enabled" boolean not null default false, "enabled_at" timestamptz null, "last_message_id" text null, "last_message_at" timestamptz null, "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "stalker_chat_conversation_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stalker_chat_conversation_deleted_at" ON "stalker_chat_conversation" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_stalker_chat_conversation_stalker_gift_id_unique" ON "stalker_chat_conversation" (stalker_gift_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stalker_chat_conversation_customer_giver_id" ON "stalker_chat_conversation" (customer_giver_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stalker_chat_conversation_customer_recipient_id" ON "stalker_chat_conversation" (customer_recipient_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stalker_chat_conversation_is_enabled" ON "stalker_chat_conversation" (is_enabled) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stalker_chat_conversation_last_message_at" ON "stalker_chat_conversation" (last_message_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stalker_chat_conversation_is_active" ON "stalker_chat_conversation" (is_active) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "stalker_chat_message" ("id" text not null, "conversation_id" text not null, "sender_id" text not null, "content" text not null, "message_type" text not null default 'text', "file_url" text null, "reply_to_id" text null, "is_edited" boolean not null default false, "edited_at" timestamptz null, "is_deleted" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "stalker_chat_message_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stalker_chat_message_deleted_at" ON "stalker_chat_message" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stalker_chat_message_conversation_id" ON "stalker_chat_message" (conversation_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stalker_chat_message_sender_id" ON "stalker_chat_message" (sender_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stalker_chat_message_created_at" ON "stalker_chat_message" (created_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stalker_chat_message_reply_to_id" ON "stalker_chat_message" (reply_to_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stalker_chat_message_is_deleted" ON "stalker_chat_message" (is_deleted) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stalker_chat_message_message_type" ON "stalker_chat_message" (message_type) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "stalker_message_status" ("id" text not null, "message_id" text not null, "customer_id" text not null, "status" text not null default 'sent', "status_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "stalker_message_status_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stalker_message_status_deleted_at" ON "stalker_message_status" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stalker_message_status_message_id" ON "stalker_message_status" (message_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stalker_message_status_customer_id" ON "stalker_message_status" (customer_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_stalker_message_status_message_id_customer_id_unique" ON "stalker_message_status" (message_id, customer_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stalker_message_status_status" ON "stalker_message_status" (status) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stalker_message_status_status_at" ON "stalker_message_status" (status_at) WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "stalker_gift" add column if not exists "customer_giver_id" text null, add column if not exists "customer_recipient_id" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "stalker_chat_conversation" cascade;`);

    this.addSql(`drop table if exists "stalker_chat_message" cascade;`);

    this.addSql(`drop table if exists "stalker_message_status" cascade;`);

    this.addSql(`alter table if exists "stalker_gift" drop column if exists "customer_giver_id", drop column if exists "customer_recipient_id";`);
  }

}
