# Script para limpiar secretos del historial de Git
# Ejecutar desde la raíz del proyecto: .\clean-secrets.ps1

Write-Host "🔒 Limpiando secretos del historial de Git..." -ForegroundColor Yellow
Write-Host "⚠️  Esto reescribirá el historial de Git. Asegúrate de hacer backup." -ForegroundColor Red
Write-Host ""

# Crear backup
Write-Host "📦 Creando backup de la rama actual..." -ForegroundColor Cyan
git branch backup-before-secret-clean $(Get-Date -Format "yyyyMMdd-HHmmss")

# Lista de reemplazos (secreto => placeholder)
$replacements = @{
    "487013852976-bm1mf4lejj1ekblmdilp5lrp093lm9k4.apps.googleusercontent.com" = "YOUR_GOOGLE_CLIENT_ID_HERE"
    "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" = "YOUR_GOOGLE_CLIENT_SECRET_HERE"
    "AKIAX6JAIMOM6CKT62P3" = "YOUR_AWS_ACCESS_KEY_ID_HERE"
    # Agregar más secretos aquí si los encuentras
}

# Función para reemplazar en archivos
function Replace-Secrets {
    param([string]$filePath)
    
    $content = Get-Content $filePath -Raw -ErrorAction SilentlyContinue
    if ($null -eq $content) { return }
    
    $modified = $false
    foreach ($secret in $replacements.Keys) {
        $placeholder = $replacements[$secret]
        if ($content -match [regex]::Escape($secret)) {
            $content = $content -replace [regex]::Escape($secret), $placeholder
            $modified = $true
            Write-Host "  ✓ Reemplazado secreto en $filePath" -ForegroundColor Green
        }
    }
    
    if ($modified) {
        Set-Content -Path $filePath -Value $content -NoNewline
        return $true
    }
    return $false
}

# Archivos que pueden contener secretos
$filesToCheck = @(
    "tanku-backend/ENV_TEMPLATE_COMPLETO.txt",
    "tanku-backend/GUIA_PRUEBAS.md",
    "tanku-backend/GUIA_PRUEBA_GOOGLE_OAUTH.md"
)

Write-Host "🔍 Buscando y reemplazando secretos en commits..." -ForegroundColor Cyan

# Obtener todos los commits que modifican estos archivos
$commits = git log --all --pretty=format:"%H" -- $filesToCheck

foreach ($commit in $commits) {
    Write-Host "  Procesando commit: $($commit.Substring(0,7))..." -ForegroundColor Gray
    
    foreach ($file in $filesToCheck) {
        try {
            $fileContent = git show "$commit`:$file" 2>$null
            if ($null -ne $fileContent) {
                # Verificar si contiene secretos
                $hasSecret = $false
                foreach ($secret in $replacements.Keys) {
                    if ($fileContent -match [regex]::Escape($secret)) {
                        $hasSecret = $true
                        break
                    }
                }
                
                if ($hasSecret) {
                    Write-Host "    ⚠️  Secretos encontrados en $file en commit $($commit.Substring(0,7))" -ForegroundColor Yellow
                }
            }
        } catch {
            # Archivo no existe en este commit, continuar
        }
    }
}

Write-Host ""
Write-Host "⚠️  LIMPIEZA MANUAL REQUERIDA:" -ForegroundColor Red
Write-Host "Para limpiar completamente el historial, usa uno de estos métodos:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. BFG Repo-Cleaner (Recomendado):" -ForegroundColor Cyan
Write-Host "   bfg --replace-text replacements.txt .git"
Write-Host ""
Write-Host "2. git filter-repo:" -ForegroundColor Cyan
Write-Host "   pip install git-filter-repo"
Write-Host "   git filter-repo --path-glob 'tanku-backend/*TEMPLATE*.txt' --path-glob 'tanku-backend/*GUIA*.md' --invert-paths"
Write-Host ""
Write-Host "3. Crear un nuevo branch limpio desde antes del commit problemático:" -ForegroundColor Cyan
Write-Host "   git checkout -b main-clean fb01f25  # Commit antes de 46a42c9"
Write-Host "   git cherry-pick <commits-deseados>"
Write-Host ""
Write-Host "📝 Después de limpiar, necesitarás hacer:" -ForegroundColor Yellow
Write-Host "   git push --force-with-lease origin main"
Write-Host ""
