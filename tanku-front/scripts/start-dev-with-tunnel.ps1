# Script para iniciar desarrollo con túnel ngrok para ePayco
# Uso: .\scripts\start-dev-with-tunnel.ps1

Write-Host "🚀 Iniciando desarrollo con túnel para ePayco..." -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  IMPORTANTE: Asegúrate de que tu backend esté corriendo en el puerto 9000" -ForegroundColor Yellow
Write-Host ""

# Verificar si ngrok está instalado
if (-not (Get-Command ngrok -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: ngrok no está instalado" -ForegroundColor Red
    Write-Host ""
    Write-Host "Instala ngrok desde: https://ngrok.com/download" -ForegroundColor Yellow
    Write-Host "O con chocolatey: choco install ngrok" -ForegroundColor Yellow
    Write-Host "O con npm: npm install -g ngrok" -ForegroundColor Yellow
    exit 1
}

# Verificar si el puerto 9000 está en uso
$portInUse = Get-NetTCPConnection -LocalPort 9000 -ErrorAction SilentlyContinue
if (-not $portInUse) {
    Write-Host "⚠️  Advertencia: No se detectó actividad en el puerto 9000" -ForegroundColor Yellow
    Write-Host "   Asegúrate de que tu backend esté corriendo antes de continuar" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "¿Deseas continuar de todos modos? (s/n)"
    if ($continue -ne "s" -and $continue -ne "S") {
        exit 0
    }
}

# Iniciar ngrok
Write-Host "📡 Iniciando ngrok en el puerto 9000..." -ForegroundColor Cyan
Start-Process ngrok -ArgumentList "http 9000" -WindowStyle Hidden

# Esperar a que ngrok se inicie
Write-Host "⏳ Esperando a que ngrok se inicie..." -ForegroundColor Yellow
Start-Sleep -Seconds 4

# Obtener la URL pública
try {
    $response = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -Method Get -ErrorAction Stop
    $httpsTunnel = $response.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1
    
    if ($httpsTunnel) {
        $ngrokUrl = $httpsTunnel.public_url
        Write-Host ""
        Write-Host "✅ URL pública obtenida: $ngrokUrl" -ForegroundColor Green
        Write-Host ""
        Write-Host "📝 Actualiza tu .env.local con:" -ForegroundColor Yellow
        Write-Host "NEXT_PUBLIC_EPAYCO_WEBHOOK_URL=$ngrokUrl" -ForegroundColor White
        Write-Host ""
        Write-Host "💡 También puedes copiar esta línea:" -ForegroundColor Cyan
        Write-Host "echo NEXT_PUBLIC_EPAYCO_WEBHOOK_URL=$ngrokUrl >> .env.local" -ForegroundColor Gray
        Write-Host ""
        Write-Host "⚠️  Recuerda reiniciar tu servidor de Next.js después de actualizar .env.local" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Presiona Ctrl+C para detener ngrok" -ForegroundColor Yellow
        Write-Host ""
        
        # Mantener el script corriendo
        Write-Host "Ngrok está corriendo. Presiona cualquier tecla para detener..." -ForegroundColor Cyan
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        
        # Detener ngrok
        Get-Process -Name ngrok -ErrorAction SilentlyContinue | Stop-Process -Force
        Write-Host ""
        Write-Host "✅ Ngrok detenido" -ForegroundColor Green
    } else {
        Write-Host "❌ Error: No se encontró túnel HTTPS" -ForegroundColor Red
        Write-Host "   Verifica que ngrok se haya iniciado correctamente" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error al obtener URL de ngrok: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Verifica que:" -ForegroundColor Yellow
    Write-Host "1. Ngrok esté instalado correctamente" -ForegroundColor Yellow
    Write-Host "2. No haya otro proceso usando el puerto 4040" -ForegroundColor Yellow
    Write-Host "3. Puedas acceder a http://localhost:4040" -ForegroundColor Yellow
}

