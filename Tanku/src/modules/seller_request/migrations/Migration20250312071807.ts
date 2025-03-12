import { Migration } from '@mikro-orm/migrations';

export class Migration20250312071807 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "seller_request" add column if not exists "comment" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "seller_request" drop column if exists "comment";`);
  }

}
