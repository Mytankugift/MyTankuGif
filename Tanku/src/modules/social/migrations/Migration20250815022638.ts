import { Migration } from '@mikro-orm/migrations';

export class Migration20250815022638 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "poster_reaction" drop constraint if exists "poster_reaction_poster_id_customer_id_unique";`);
    this.addSql(`create table if not exists "poster_comment" ("id" text not null, "poster_id" text not null, "customer_id" text not null, "content" text not null, "parent_id" text null, "likes_count" integer not null default 0, "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "poster_comment_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_poster_comment_deleted_at" ON "poster_comment" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_poster_comment_poster_id" ON "poster_comment" (poster_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_poster_comment_customer_id" ON "poster_comment" (customer_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_poster_comment_parent_id" ON "poster_comment" (parent_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_poster_comment_created_at" ON "poster_comment" (created_at) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "poster_reaction" ("id" text not null, "poster_id" text not null, "customer_id" text not null, "reaction_type" text check ("reaction_type" in ('like', 'love', 'laugh', 'angry', 'tanku')) not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "poster_reaction_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_poster_reaction_deleted_at" ON "poster_reaction" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_poster_reaction_poster_id" ON "poster_reaction" (poster_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_poster_reaction_customer_id" ON "poster_reaction" (customer_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_poster_reaction_reaction_type" ON "poster_reaction" (reaction_type) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_poster_reaction_poster_id_customer_id_unique" ON "poster_reaction" (poster_id, customer_id) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "poster_comment" cascade;`);

    this.addSql(`drop table if exists "poster_reaction" cascade;`);
  }

}
