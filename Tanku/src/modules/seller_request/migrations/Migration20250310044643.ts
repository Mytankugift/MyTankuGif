import { Migration } from "@mikro-orm/migrations";

export class Migration20250310044643 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "request_status" ("id" text not null, "status" text check ("status" in ('aceptado', 'rechazado', 'corrección','pendiente')) not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "request_status_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_request_status_deleted_at" ON "request_status" (deleted_at) WHERE deleted_at IS NULL;`
    );

    this.addSql(`INSERT INTO "request_status" ("id", "status") VALUES 
      ('id_accept', 'aceptado'),
      ('id_reject', 'rechazado'),
      ('id_correction', 'corrección'),
      ('id_pending', 'pendiente')
      ON CONFLICT ("id") DO NOTHING;`);

    this.addSql(
      `create table if not exists "seller_request" ("id" text not null, "first_name" text not null, "last_name" text not null, "email" text not null, "phone" text not null, "address" text not null, "city" text not null, "region" text not null, "country" text not null, "website" text not null, "social_media" text not null, "rutFile" text not null, "commerceFile" text not null, "idFile" text not null, "status_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "seller_request_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_seller_request_status_id" ON "seller_request" (status_id) WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_seller_request_deleted_at" ON "seller_request" (deleted_at) WHERE deleted_at IS NULL;`
    );

    this.addSql(
      `alter table if exists "seller_request" add constraint "seller_request_status_id_foreign" foreign key ("status_id") references "request_status" ("id") on update cascade;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "seller_request" drop constraint if exists "seller_request_status_id_foreign";`
    );

    this.addSql(`drop table if exists "request_status" cascade;`);

    this.addSql(`drop table if exists "seller_request" cascade;`);
  }
}
