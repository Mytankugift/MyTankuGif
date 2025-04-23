import { Migration } from "@mikro-orm/migrations";

export class Migration20250409014332 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "variant_inventory_tanku" drop constraint if exists "variant_inventory_tanku_variant_id_unique";`
    );
    this.addSql(
      `create table if not exists "variant_inventory_tanku" ("id" text not null, "variant_id" text not null, "quantity_stock" integer not null, "currency_code" text not null, "price" integer not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "variant_inventory_tanku_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_variant_inventory_tanku_deleted_at" ON "variant_inventory_tanku" (deleted_at) WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_variant_inventory_tanku_variant_id_unique" ON "variant_inventory_tanku" (variant_id) WHERE deleted_at IS NULL;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "variant_inventory_tanku" cascade;`);
  }
}
