param([switch]$SinAbrir, [switch]$Reconstruir)
$ErrorActionPreference = 'Stop'
$projectDir = $PSScriptRoot
$backendDir = Join-Path $projectDir 'BACKEND'
$frontendDir = Join-Path $projectDir 'FRONTEND'
try {
    $nodeCommand = Get-Command node.exe -ErrorAction Stop
    $npmCommand = Get-Command npm.cmd -ErrorAction Stop
    $nodeVersion = [version]((& $nodeCommand.Source -p 'process.versions.node').Trim())
    if (-not (($nodeVersion.Major -eq 22 -and $nodeVersion -ge [version]'22.12.0') -or $nodeVersion.Major -ge 24)) {
        throw 'Instala Node.js 24 desde nodejs.org y vuelve a abrir este archivo. También se admite Node 22.12 o posterior de la rama 22.'
    }
    Push-Location $backendDir
    try {
        if (-not (Test-Path -LiteralPath 'node_modules/@electric-sql/pglite/package.json')) {
            Write-Host 'Primera instalación: descargando dependencias del servidor...'
            & $npmCommand.Source ci --no-audit --no-fund
            if ($LASTEXITCODE -ne 0) { throw 'No se pudieron instalar las dependencias. Comprueba Internet y vuelve a intentar.' }
        }
        & $nodeCommand.Source scripts/configure-local.cjs
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo preparar la configuración local.' }
        $existing = $null
        try { $existing = Invoke-RestMethod -Uri 'http://127.0.0.1:3001/api/health' -TimeoutSec 2 } catch { }
        if ($existing) {
            if ($existing.service -notin @('asistente-financiero-local','asistente-financiero')) { throw 'El puerto 3001 responde con otro servicio. Ciérralo antes de iniciar el asistente.' }
            Write-Host 'El servidor ya está iniciado en http://127.0.0.1:3001'
            if (-not $SinAbrir) { Start-Process 'http://127.0.0.1:3001' }
            return
        }
        if ($Reconstruir -or -not (Test-Path -LiteralPath (Join-Path $frontendDir 'dist/FRONTEND/browser/index.html'))) {
            Push-Location $frontendDir
            try {
                if (-not (Test-Path -LiteralPath 'node_modules/@angular/build/package.json')) {
                    & $npmCommand.Source ci --no-audit --no-fund
                    if ($LASTEXITCODE -ne 0) { throw 'No se pudieron instalar las dependencias de la interfaz.' }
                }
                & $npmCommand.Source run build
                if ($LASTEXITCODE -ne 0) { throw 'La interfaz no se compiló. Revisa el mensaje anterior.' }
            } finally { Pop-Location }
        }
        & $npmCommand.Source run db:seed
        if ($LASTEXITCODE -ne 0) { throw 'La base local no está disponible. Cierra otra instancia del servidor y vuelve a intentar.' }
        Write-Host ''
        Write-Host 'ASISTENTE FINANCIERO LOCAL' -ForegroundColor Green
        Write-Host 'Abre http://127.0.0.1:3001 . Conserva esta ventana abierta.'
        Write-Host 'Detener: Ctrl+C. Tus datos permanecen en BACKEND/data/local.'
        if ($SinAbrir) { & $nodeCommand.Source index.js } else { & $nodeCommand.Source index.js --open }
        if ($LASTEXITCODE -ne 0) { throw 'El servidor se detuvo con un error. Consulta el mensaje anterior.' }
    } finally { Pop-Location }
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
