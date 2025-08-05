import { Migration } from '@mikro-orm/migrations';

export class Migration20250723205053 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "friend_request" drop constraint if exists "friend_request_sender_id_receiver_id_unique";`);
    this.addSql(`alter table if exists "friend_in_group" drop constraint if exists "friend_in_group_group_id_customer_id_unique";`);
    this.addSql(`alter table if exists "friend" drop constraint if exists "friend_customer_id_friend_customer_id_unique";`);
    this.addSql(`create table if not exists "events_calendar" ("id" text not null, "customer_id" text not null, "event_name" text not null, "event_date" timestamptz not null, "description" text null, "location" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "events_calendar_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_events_calendar_deleted_at" ON "events_calendar" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_events_calendar_customer_id" ON "events_calendar" (customer_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_events_calendar_event_date" ON "events_calendar" (event_date) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_events_calendar_customer_id_event_date" ON "events_calendar" (customer_id, event_date) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "friend" ("id" text not null, "customer_id" text not null, "friend_customer_id" text not null, "role" text not null default 'friend', "friendship_date" timestamptz not null, "is_favorite" boolean not null default false, "nickname" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "friend_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_friend_deleted_at" ON "friend" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_friend_customer_id" ON "friend" (customer_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_friend_friend_customer_id" ON "friend" (friend_customer_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_friend_customer_id_friend_customer_id_unique" ON "friend" (customer_id, friend_customer_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_friend_role" ON "friend" (role) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "friend_in_group" ("id" text not null, "group_id" text not null, "customer_id" text not null, "role" text not null default 'member', "joined_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "friend_in_group_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_friend_in_group_deleted_at" ON "friend_in_group" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_friend_in_group_group_id" ON "friend_in_group" (group_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_friend_in_group_customer_id" ON "friend_in_group" (customer_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_friend_in_group_group_id_customer_id_unique" ON "friend_in_group" (group_id, customer_id) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "friend_request" ("id" text not null, "sender_id" text not null, "receiver_id" text not null, "status" text not null default 'pending', "message" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "friend_request_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_friend_request_deleted_at" ON "friend_request" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_friend_request_sender_id" ON "friend_request" (sender_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_friend_request_receiver_id" ON "friend_request" (receiver_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_friend_request_sender_id_receiver_id_unique" ON "friend_request" (sender_id, receiver_id) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "friendship_groups" ("id" text not null, "group_name" text not null, "description" text null, "image_url" text null, "created_by" text not null, "is_private" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "friendship_groups_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_friendship_groups_deleted_at" ON "friendship_groups" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_friendship_groups_created_by" ON "friendship_groups" (created_by) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_friendship_groups_group_name" ON "friendship_groups" (group_name) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "poster" ("id" text not null, "customer_id" text not null, "title" text null, "description" text null, "image_url" text not null, "video_url" text null, "likes_count" integer not null default 0, "comments_count" integer not null default 0, "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "poster_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_poster_deleted_at" ON "poster" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_poster_customer_id" ON "poster" (customer_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_poster_is_active" ON "poster" (is_active) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "stories_user" ("id" text not null, "customer_id" text not null, "title" text not null, "description" text null, "duration" integer not null default 24, "views_count" integer not null default 0, "is_active" boolean not null default true, "expires_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "stories_user_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stories_user_deleted_at" ON "stories_user" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stories_user_customer_id" ON "stories_user" (customer_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stories_user_expires_at" ON "stories_user" (expires_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stories_user_is_active" ON "stories_user" (is_active) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "story_file" ("id" text not null, "story_id" text not null, "file_url" text not null, "file_type" text not null, "file_size" integer null, "duration" integer null, "order_index" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "story_file_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_story_file_deleted_at" ON "story_file" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_story_file_story_id" ON "story_file" (story_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_story_file_file_type" ON "story_file" (file_type) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_story_file_story_id_order_index" ON "story_file" (story_id, order_index) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "events_calendar" cascade;`);

    this.addSql(`drop table if exists "friend" cascade;`);

    this.addSql(`drop table if exists "friend_in_group" cascade;`);

    this.addSql(`drop table if exists "friend_request" cascade;`);

    this.addSql(`drop table if exists "friendship_groups" cascade;`);

    this.addSql(`drop table if exists "poster" cascade;`);

    this.addSql(`drop table if exists "stories_user" cascade;`);

    this.addSql(`drop table if exists "story_file" cascade;`);
  }

}
