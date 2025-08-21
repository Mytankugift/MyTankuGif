import { Migration } from '@mikro-orm/migrations';

export class Migration20250819001049 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "friend_in_group" add column if not exists "solicitation_status" text not null default 'pending';`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "friend_in_group" drop column if exists "solicitation_status";`);
  }

}
