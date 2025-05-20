import { Migration } from '@mikro-orm/migrations';

export class Migration20250520203103 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "customer_token" ("id" text not null, "token" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "customer_token_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_customer_token_deleted_at" ON "customer_token" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "customer_token" cascade;`);
  }

}
