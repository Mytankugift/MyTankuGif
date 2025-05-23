import { Migration } from '@mikro-orm/migrations';

export class Migration20250522005239 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "customer_token" add column if not exists "id_customer_wordpress" text not null, add column if not exists "email" text not null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "customer_token" drop column if exists "id_customer_wordpress", drop column if exists "email";`);
  }

}
