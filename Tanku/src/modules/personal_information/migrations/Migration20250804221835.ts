import { Migration } from '@mikro-orm/migrations';

export class Migration20250804221835 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "personal_information" drop constraint if exists "personal_information_customer_id_unique";`);
    this.addSql(`create table if not exists "personal_information" ("id" text not null, "customer_id" text not null, "avatar_url" text null, "status_message" text null, "banner_profile_url" text null, "social_url" jsonb null, "birthday" timestamptz null, "marital_status" text null, "languages" jsonb null, "interests" jsonb null, "favorite_colors" jsonb null, "favorite_activities" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "personal_information_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_personal_information_deleted_at" ON "personal_information" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_personal_information_customer_id_unique" ON "personal_information" (customer_id) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "personal_information" cascade;`);
  }

}
