# Script para aplicar la migración manual de Dropi y Warehouse
# Ejecuta el SQL directamente en la base de datos

Write-Host "🔄 Aplicando migración manual: 20250120000000_adjust_dropi_and_warehouse" -ForegroundColor Cyan

# Leer el archivo SQL
$migrationFile = "prisma\migrations\20250120000000_adjust_dropi_and_warehouse\migration.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ No se encontró el archivo de migración: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "📄 Archivo encontrado: $migrationFile" -ForegroundColor Green

# Opción 1: Usar Prisma db execute
Write-Host "`n🔧 Ejecutando con Prisma db execute..." -ForegroundColor Yellow
npx prisma db execute --file $migrationFile --schema prisma/schema.prisma

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Migración aplicada exitosamente!" -ForegroundColor Green
    Write-Host "`n🔄 Regenerando Prisma Client..." -ForegroundColor Yellow
    npx prisma generate
    
    Write-Host "`n✅ ¡Listo! La migración ha sido aplicada y el cliente Prisma ha sido regenerado." -ForegroundColor Green
} else {
    Write-Host "`n❌ Error al aplicar la migración. Verifica los logs arriba." -ForegroundColor Red
    Write-Host "`n💡 Alternativa: Ejecuta el SQL manualmente con psql:" -ForegroundColor Yellow
    Write-Host "   psql -U tu_usuario -d tanku_backend -f $migrationFile" -ForegroundColor Gray
}
