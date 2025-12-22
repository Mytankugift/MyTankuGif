# Script de prueba para el sistema de jobs de Dropi
# Uso: .\scripts\test-dropi-jobs.ps1

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🧪 PRUEBA RÁPIDA DEL SISTEMA DE JOBS DE DROPI" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Ejecuta este script desde el directorio tanku-backend" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Paso 1: Verificando Prisma Client..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules\.prisma\client\index.js")) {
    Write-Host "⚠️  Prisma Client no generado. Ejecutando: npm run prisma:generate" -ForegroundColor Yellow
    npm run prisma:generate
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error generando Prisma Client" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Prisma Client OK" -ForegroundColor Green
}

Write-Host ""
Write-Host "📋 Paso 2: Ejecutando script de prueba..." -ForegroundColor Yellow
Write-Host ""

# Ejecutar el script de prueba TypeScript
npx tsx src/modules/dropi-jobs/test-jobs.ts

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "💡 PRÓXIMOS PASOS:" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Inicia los workers en otra terminal:" -ForegroundColor White
Write-Host "   npx tsx src/modules/dropi-jobs/workers/start-workers.ts" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Crea un job desde la API:" -ForegroundColor White
Write-Host "   curl -X POST http://localhost:9000/api/v1/dropi/sync-raw" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Monitorea el job:" -ForegroundColor White
Write-Host "   curl http://localhost:9000/api/v1/dropi/jobs/{jobId}" -ForegroundColor Gray
Write-Host ""
