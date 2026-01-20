<#
.SYNOPSIS
    Business Central Container Health Diagnostics

.DESCRIPTION
    Diagnostic script to troubleshoot BC container startup and health issues.
    Particularly useful for BC 27.3 containers on LTSC 2025.

.PARAMETER ContainerName
    Name of the BC container to diagnose

.EXAMPLE
    .\Diagnose-BC-Container.ps1 -ContainerName bcserver-bc273

.NOTES
    Author: CosmicBytez IT Operations
    Version: 1.0
    Last Updated: 2026-01-20
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [string]$ContainerName
)

$ErrorActionPreference = 'Continue'

function Write-DiagnosticSection {
    param([string]$Title)
    Write-Host ""
    Write-Host "====== $Title ======" -ForegroundColor Cyan
}

function Write-DiagnosticResult {
    param(
        [string]$Label,
        [string]$Value,
        [string]$Status = 'INFO'
    )
    $color = switch ($Status) {
        'OK'    { 'Green' }
        'WARN'  { 'Yellow' }
        'ERROR' { 'Red' }
        default { 'White' }
    }
    Write-Host "  $Label`: " -NoNewline
    Write-Host $Value -ForegroundColor $color
}

# Main diagnostic sequence
Write-Host ""
Write-Host "BC Container Health Diagnostics - $ContainerName" -ForegroundColor Green
Write-Host "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

# 1. Container existence and basic info
Write-DiagnosticSection "Container Status"

$containerExists = docker ps -a --filter "name=^${ContainerName}$" --format "{{.Names}}" 2>$null
if (-not $containerExists) {
    Write-DiagnosticResult "Container" "NOT FOUND" "ERROR"
    Write-Host ""
    Write-Host "Container '$ContainerName' does not exist." -ForegroundColor Red
    exit 1
}

Write-DiagnosticResult "Container" "Found" "OK"

$containerState = docker inspect --format '{{.State.Status}}' $ContainerName 2>$null
$containerRunning = $containerState -eq 'running'
Write-DiagnosticResult "State" $containerState $(if ($containerRunning) { "OK" } else { "ERROR" })

$healthStatus = docker inspect --format '{{.State.Health.Status}}' $ContainerName 2>$null
if ($healthStatus) {
    $healthColor = switch ($healthStatus) {
        'healthy'   { 'OK' }
        'starting'  { 'WARN' }
        'unhealthy' { 'ERROR' }
        default     { 'INFO' }
    }
    Write-DiagnosticResult "Health" $healthStatus $healthColor
} else {
    Write-DiagnosticResult "Health" "No health check configured" "WARN"
}

$uptime = docker inspect --format '{{.State.StartedAt}}' $ContainerName 2>$null
if ($uptime) {
    $startTime = [DateTime]::Parse($uptime)
    $elapsed = (Get-Date) - $startTime
    Write-DiagnosticResult "Uptime" "$([math]::Round($elapsed.TotalMinutes, 1)) minutes" "INFO"
}

# 2. Container configuration
Write-DiagnosticSection "Container Configuration"

$image = docker inspect --format '{{.Config.Image}}' $ContainerName 2>$null
Write-DiagnosticResult "Image" $image "INFO"

$isolation = docker inspect --format '{{.HostConfig.Isolation}}' $ContainerName 2>$null
Write-DiagnosticResult "Isolation" $isolation "INFO"

$memory = docker inspect --format '{{.HostConfig.Memory}}' $ContainerName 2>$null
if ($memory -and $memory -ne '0') {
    $memoryGB = [math]::Round([int64]$memory / 1GB, 1)
    Write-DiagnosticResult "Memory Limit" "${memoryGB}GB" "INFO"
}

# 3. Port bindings
Write-DiagnosticSection "Port Bindings"

$ports = docker inspect --format '{{range $p, $conf := .NetworkSettings.Ports}}{{$p}} -> {{(index $conf 0).HostPort}}{{"\n"}}{{end}}' $ContainerName 2>$null
if ($ports) {
    $ports -split "`n" | Where-Object { $_ } | ForEach-Object {
        Write-Host "  $_"
    }
} else {
    Write-DiagnosticResult "Ports" "No port mappings found" "WARN"
}

# 4. BC Services (if container is running)
if ($containerRunning) {
    Write-DiagnosticSection "BC Services Status"

    try {
        $services = docker exec $ContainerName powershell -Command "Get-Service | Where-Object { `$_.Name -like '*BC*' -or `$_.Name -like '*NAV*' } | Select-Object Name, Status, StartType" 2>$null

        if ($services) {
            $services | ForEach-Object {
                $status = if ($_.Status -eq 'Running') { 'OK' } else { 'ERROR' }
                Write-DiagnosticResult $_.Name "$($_.Status) ($($_.StartType))" $status
            }
        } else {
            Write-DiagnosticResult "BC Services" "No BC/NAV services found" "WARN"
        }
    } catch {
        Write-DiagnosticResult "BC Services" "Unable to query services: $($_.Exception.Message)" "ERROR"
    }

    # 5. Event logs (BC-specific errors)
    Write-DiagnosticSection "Recent Windows Event Logs (Errors)"

    try {
        $eventLogs = docker exec $ContainerName powershell -Command "Get-EventLog -LogName Application -Newest 10 -EntryType Error -ErrorAction SilentlyContinue | Where-Object { `$_.Source -like '*BusinessCentral*' -or `$_.Source -like '*Dynamics*' } | Select-Object TimeGenerated, Source, Message" 2>$null

        if ($eventLogs) {
            $eventLogs | ForEach-Object {
                Write-Host "  [$($_.TimeGenerated)] $($_.Source)" -ForegroundColor Yellow
                Write-Host "    $($_.Message.Substring(0, [Math]::Min(200, $_.Message.Length)))..." -ForegroundColor Gray
            }
        } else {
            Write-DiagnosticResult "BC Event Errors" "None found in last 10 entries" "OK"
        }
    } catch {
        Write-DiagnosticResult "Event Logs" "Unable to query: $($_.Exception.Message)" "WARN"
    }
}

# 6. Recent container logs
Write-DiagnosticSection "Recent Container Logs (Last 30 Lines)"

$logs = docker logs --tail 30 $ContainerName 2>&1
if ($logs) {
    $logs | ForEach-Object {
        # Colorize based on content
        if ($_ -match 'error|exception|failed') {
            Write-Host "  $_" -ForegroundColor Red
        }
        elseif ($_ -match 'warning|warn') {
            Write-Host "  $_" -ForegroundColor Yellow
        }
        elseif ($_ -match 'success|ready|started|healthy') {
            Write-Host "  $_" -ForegroundColor Green
        }
        else {
            Write-Host "  $_"
        }
    }
} else {
    Write-DiagnosticResult "Container Logs" "No logs available" "WARN"
}

# 7. Health check history
Write-DiagnosticSection "Health Check History (Last 5 Results)"

try {
    $healthLog = docker inspect --format '{{range .State.Health.Log}}{{.Start}}: {{.ExitCode}} - {{.Output}}{{"\n"}}{{end}}' $ContainerName 2>$null | Select-Object -Last 5

    if ($healthLog) {
        $healthLog | ForEach-Object {
            if ($_ -match 'ExitCode: 0') {
                Write-Host "  $_" -ForegroundColor Green
            }
            elseif ($_ -match 'ExitCode: [^0]') {
                Write-Host "  $_" -ForegroundColor Red
            }
            else {
                Write-Host "  $_"
            }
        }
    } else {
        Write-DiagnosticResult "Health History" "No health check history available" "INFO"
    }
} catch {
    Write-DiagnosticResult "Health History" "Unable to retrieve: $($_.Exception.Message)" "WARN"
}

# 8. Recommendations
Write-DiagnosticSection "Recommendations"

if ($healthStatus -eq 'unhealthy' -or $healthStatus -eq 'starting') {
    Write-Host "  Container health status is '$healthStatus'. Consider:" -ForegroundColor Yellow
    Write-Host "    1. Wait longer - BC 27.3 on LTSC 2025 may need 15-30 minutes for first startup"
    Write-Host "    2. Check logs for specific errors: docker logs $ContainerName"
    Write-Host "    3. Verify BC services are running inside container"
    Write-Host "    4. Try accessing web client: http://localhost:<port>/BC/"
    Write-Host "    5. If process isolation, try Hyper-V: -Isolation hyperv"
}
elseif (-not $containerRunning) {
    Write-Host "  Container is not running. Check:" -ForegroundColor Red
    Write-Host "    1. Container exit code: docker inspect --format '{{.State.ExitCode}}' $ContainerName"
    Write-Host "    2. Full logs: docker logs $ContainerName"
    Write-Host "    3. Restart container: docker start $ContainerName"
}
elseif ($healthStatus -eq 'healthy') {
    Write-Host "  Container appears to be healthy!" -ForegroundColor Green
    Write-Host "    Access web client at: http://localhost:<port>/BC/"
}

Write-Host ""
Write-Host "====== End of Diagnostics ======" -ForegroundColor Cyan
Write-Host ""
