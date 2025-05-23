import { Migration } from "@mikro-orm/migrations";

export class Migration20250522005239 extends Migration {
  override async up(): Promise<void> {
    // Primero agregamos las columnas permitiendo valores nulos
    this.addSql(
      `alter table if exists "customer_token" add column if not exists "id_customer_wordpress" text, add column if not exists "email" text;`
    );
    
    // Actualizamos los registros existentes con valores predeterminados
    this.addSql(
      `update "customer_token" set "id_customer_wordpress" = '' where "id_customer_wordpress" is null;`
    );
    
    this.addSql(
      `update "customer_token" set "email" = '' where "email" is null;`
    );
    
    // Ahora hacemos las columnas NOT NULL después de haber establecido valores predeterminados
    this.addSql(
      `alter table if exists "customer_token" alter column "id_customer_wordpress" set not null, alter column "email" set not null;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "customer_token" drop column if exists "id_customer_wordpress", drop column if exists "email";`
    );
  }
}
