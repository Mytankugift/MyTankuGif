import { Migration } from '@mikro-orm/migrations';

export class Migration20250821015655 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "onboarding_status" drop constraint if exists "onboarding_status_customer_id_unique";`);
    this.addSql(`alter table if exists "onboarding_phase_two" drop constraint if exists "onboarding_phase_two_customer_id_unique";`);
    this.addSql(`alter table if exists "onboarding_phase_one" drop constraint if exists "onboarding_phase_one_customer_id_unique";`);
    this.addSql(`create table if not exists "onboarding_phase_one" ("id" text not null, "customer_id" text not null, "birth_date" timestamptz not null, "gender" text not null, "marital_status" text not null, "country" text not null, "city" text not null, "languages" jsonb not null, "main_interests" jsonb not null, "representative_colors" jsonb not null, "favorite_activities" jsonb not null, "important_celebrations" jsonb null, "completed_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "onboarding_phase_one_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_onboarding_phase_one_deleted_at" ON "onboarding_phase_one" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_onboarding_phase_one_customer_id_unique" ON "onboarding_phase_one" (customer_id) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "onboarding_phase_two" ("id" text not null, "customer_id" text not null, "product_interests" jsonb not null, "favorite_social_networks" jsonb not null, "preferred_interaction" jsonb not null, "purchase_frequency" text not null, "monthly_budget" text not null, "brand_preference" text not null, "purchase_motivation" text not null, "social_circles" jsonb not null, "wants_connections" text not null, "connection_types" jsonb null, "lifestyle_style" jsonb not null, "personal_values" jsonb not null, "platform_expectations" jsonb not null, "preferred_content_type" jsonb not null, "connection_moments" jsonb not null, "shopping_days" text not null, "ecommerce_experience" text not null, "social_activity_level" text not null, "notifications_preference" text not null, "completed_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "onboarding_phase_two_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_onboarding_phase_two_deleted_at" ON "onboarding_phase_two" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_onboarding_phase_two_customer_id_unique" ON "onboarding_phase_two" (customer_id) WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "onboarding_status" ("id" text not null, "customer_id" text not null, "phase_one_completed" boolean not null default false, "phase_two_completed" boolean not null default false, "phase_one_completed_at" timestamptz null, "phase_two_completed_at" timestamptz null, "incentive_popup_shown" boolean not null default false, "incentive_popup_dismissed" boolean not null default false, "incentive_popup_last_shown" timestamptz null, "phase_one_current_step" integer not null default 1, "phase_two_current_step" integer not null default 1, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "onboarding_status_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_onboarding_status_deleted_at" ON "onboarding_status" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_onboarding_status_customer_id_unique" ON "onboarding_status" (customer_id) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "onboarding_phase_one" cascade;`);

    this.addSql(`drop table if exists "onboarding_phase_two" cascade;`);

    this.addSql(`drop table if exists "onboarding_status" cascade;`);
  }

}
