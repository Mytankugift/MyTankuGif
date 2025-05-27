import { Migration } from '@mikro-orm/migrations';

export class Migration20250525162604 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "wish_list_state" ("id" text not null, "state" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "wish_list_state_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_wish_list_state_deleted_at" ON "wish_list_state" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "wish_list" ("id" text not null, "title" text not null, "state_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "wish_list_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_wish_list_state_id" ON "wish_list" (state_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_wish_list_deleted_at" ON "wish_list" (deleted_at) WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "wish_list" add constraint "wish_list_state_id_foreign" foreign key ("state_id") references "wish_list_state" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "wish_list" drop constraint if exists "wish_list_state_id_foreign";`);

    this.addSql(`drop table if exists "wish_list_state" cascade;`);

    this.addSql(`drop table if exists "wish_list" cascade;`);
  }

}
