import { Migration } from '@mikro-orm/migrations';

export class Migration20251029120000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "personal_information" add column if not exists "pseudonym" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "personal_information" drop column if exists "pseudonym";`);
  }
}


