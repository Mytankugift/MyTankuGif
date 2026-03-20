-- Tabla para última ejecución de crons / jobs (ERP + auditoría)

CREATE TABLE IF NOT EXISTS "cron_job_states" (
    "id" TEXT NOT NULL,
    "job_key" TEXT NOT NULL,
    "last_started_at" TIMESTAMP(3),
    "last_completed_at" TIMESTAMP(3),
    "last_status" TEXT,
    "last_error" TEXT,
    "metadata" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cron_job_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "cron_job_states_job_key_key" ON "cron_job_states"("job_key");
