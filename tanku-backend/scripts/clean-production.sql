-- Limpiar base de datos de producción
-- ⚠️ PELIGROSO: Esto borra TODO

-- Desconectar todas las conexiones activas
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = current_database()
  AND pid <> pg_backend_pid();

-- Eliminar todo el schema público
DROP SCHEMA IF EXISTS public CASCADE;

-- Recrear schema público
CREATE SCHEMA public;

-- Restaurar permisos
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

