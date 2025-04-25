import { Migration } from "@mikro-orm/migrations";

export class Migration20250423055015 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "order_status_tanku" ("id" text not null, "status" text check ("status" in ('pendiente', 'procesando', 'enviado', 'entregado', 'cancelado')) not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "order_status_tanku_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_order_status_tanku_deleted_at" ON "order_status_tanku" (deleted_at) WHERE deleted_at IS NULL;`
    );

    this.addSql(
      `create table if not exists "shipping_address_tanku" ("id" text not null, "first_name" text not null, "last_name" text not null, "address_1" text not null, "address_2" text null, "company" text null, "postal_code" text not null, "city" text not null, "country_code" text not null, "province" text not null, "phone" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "shipping_address_tanku_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_shipping_address_tanku_deleted_at" ON "shipping_address_tanku" (deleted_at) WHERE deleted_at IS NULL;`
    );

    this.addSql(
      `create table if not exists "order_tanku" ("id" text not null, "cart_id" text not null, "email" text not null, "payment_method" text not null, "total_amount" integer not null, "first_name" text not null, "last_name" text not null, "address_1" text not null, "address_2" text null, "company" text null, "postal_code" text not null, "city" text not null, "country_code" text not null, "province" text not null, "phone" text not null, "status_id" text not null, "shipping_address_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "order_tanku_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_order_tanku_status_id" ON "order_tanku" (status_id) WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_order_tanku_shipping_address_id" ON "order_tanku" (shipping_address_id) WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_order_tanku_deleted_at" ON "order_tanku" (deleted_at) WHERE deleted_at IS NULL;`
    );

    this.addSql(
      `create table if not exists "order_variant_tanku" ("id" text not null, "variant_id" text not null, "quantity" integer not null, "unit_price" numeric not null, "original_total" numeric not null, "order_id" text not null, "status_id" text not null, "raw_unit_price" jsonb not null, "raw_original_total" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "order_variant_tanku_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_order_variant_tanku_order_id" ON "order_variant_tanku" (order_id) WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_order_variant_tanku_status_id" ON "order_variant_tanku" (status_id) WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_order_variant_tanku_deleted_at" ON "order_variant_tanku" (deleted_at) WHERE deleted_at IS NULL;`
    );

    this.addSql(
      `alter table if exists "order_tanku" add constraint "order_tanku_status_id_foreign" foreign key ("status_id") references "order_status_tanku" ("id") on update cascade;`
    );
    this.addSql(
      `alter table if exists "order_tanku" add constraint "order_tanku_shipping_address_id_foreign" foreign key ("shipping_address_id") references "shipping_address_tanku" ("id") on update cascade;`
    );

    this.addSql(
      `alter table if exists "order_variant_tanku" add constraint "order_variant_tanku_order_id_foreign" foreign key ("order_id") references "order_tanku" ("id") on update cascade;`
    );
    this.addSql(
      `alter table if exists "order_variant_tanku" add constraint "order_variant_tanku_status_id_foreign" foreign key ("status_id") references "order_status_tanku" ("id") on update cascade;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "order_tanku" drop constraint if exists "order_tanku_status_id_foreign";`
    );

    this.addSql(
      `alter table if exists "order_variant_tanku" drop constraint if exists "order_variant_tanku_status_id_foreign";`
    );

    this.addSql(
      `alter table if exists "order_tanku" drop constraint if exists "order_tanku_shipping_address_id_foreign";`
    );

    this.addSql(
      `alter table if exists "order_variant_tanku" drop constraint if exists "order_variant_tanku_order_id_foreign";`
    );

    this.addSql(`drop table if exists "order_status_tanku" cascade;`);

    this.addSql(`drop table if exists "shipping_address_tanku" cascade;`);

    this.addSql(`drop table if exists "order_tanku" cascade;`);

    this.addSql(`drop table if exists "order_variant_tanku" cascade;`);
  }
}
