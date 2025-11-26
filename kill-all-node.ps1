# Kill all node processes (use with caution!)
Write-Host "⚠️  WARNING: This will kill ALL Node.js processes!" -ForegroundColor Yellow
Write-Host "Press CTRL+C within 3 seconds to cancel..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue

if ($nodeProcesses) {
    Write-Host "Killing $($nodeProcesses.Count) Node.js process(es)..." -ForegroundColor Red
    $nodeProcesses | Stop-Process -Force
    Write-Host "✅ All Node.js processes killed!" -ForegroundColor Green
} else {
    Write-Host "No Node.js processes found" -ForegroundColor Cyan
}
