import { Migration } from '@mikro-orm/migrations';

export class Migration20250918193118 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "stalker_gift" ("id" text not null, "total_amount" integer not null, "first_name" text not null, "phone" text not null, "email" text not null, "alias" text not null, "recipient_name" text not null, "contact_methods" jsonb not null, "products" jsonb not null, "message" text null, "payment_status" text not null default 'pending', "payment_method" text not null default 'epayco', "transaction_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "stalker_gift_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stalker_gift_deleted_at" ON "stalker_gift" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "stalker_gift" cascade;`);
  }

}
