import { Migration } from '@mikro-orm/migrations';

export class Migration20250616205647 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "user_behavior" ("id" text not null, "userId" text not null, "actionType" text check ("actionType" in ('view_product', 'add_to_cart', 'purchase', 'wishlist', 'search', 'navigation')) not null, "keywords" text[] not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "user_behavior_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_user_behavior_deleted_at" ON "user_behavior" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "user_profile" ("id" text not null, "profiles" text[] not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "user_profile_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_user_profile_deleted_at" ON "user_profile" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "user_behavior" cascade;`);

    this.addSql(`drop table if exists "user_profile" cascade;`);
  }

}
