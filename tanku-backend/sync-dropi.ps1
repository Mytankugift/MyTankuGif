# Script para sincronizar productos desde Dropi
$uri = "http://localhost:9000/api/v1/dropi/sync?limit=10"
$response = Invoke-RestMethod -Uri $uri -Method POST
Write-Host "✅ Sincronización completada:"
Write-Host "   Productos sincronizados: $($response.data.synced)"
Write-Host ""
Write-Host "📦 Verificando productos..."
$productsResponse = Invoke-RestMethod -Uri "http://localhost:9000/store/product/?limit=10" -Method GET
Write-Host "   Productos en BD: $($productsResponse.count)"
