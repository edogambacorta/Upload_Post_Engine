# Kill process on port 5000
$port = 5000
$processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
             Select-Object -ExpandProperty OwningProcess -Unique

if ($processes) {
    $killedCount = 0
    foreach ($pid in $processes) {
        # Skip system process (PID 0, 4) and invalid PIDs
        if ($pid -le 4) {
            Write-Host "Skipping system process (PID $pid)" -ForegroundColor Yellow
            continue
        }

        # Check if process exists
        $processExists = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if (-not $processExists) {
            Write-Host "Process $pid no longer exists, skipping..." -ForegroundColor Yellow
            continue
        }

        try {
            Write-Host "Killing process $pid ($(Get-Process -Id $pid | Select-Object -ExpandProperty ProcessName)) on port $port..." -ForegroundColor Yellow
            Stop-Process -Id $pid -Force -ErrorAction Stop
            $killedCount++
            Write-Host "Process $pid killed successfully!" -ForegroundColor Green
        } catch {
            Write-Host "Failed to kill process $pid : $_" -ForegroundColor Red
        }
    }

    if ($killedCount -eq 0) {
        Write-Host "No processes could be killed on port $port" -ForegroundColor Cyan
    } else {
        Write-Host "Successfully killed $killedCount process(es) on port $port" -ForegroundColor Green
    }
} else {
    Write-Host "No process found on port $port" -ForegroundColor Cyan
}
