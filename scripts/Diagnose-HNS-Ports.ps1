<#
.SYNOPSIS
    Diagnose HNS network state and port conflicts for Business Central containers

.DESCRIPTION
    This diagnostic script inspects the HNS (Host Network Service) state to identify
    orphaned endpoints, NAT mappings, and port conflicts that prevent BC container deployment.

.REQUIREMENTS
    - Run as Administrator
    - Docker Desktop installed
    - HNS module available (Windows containers)

.EXAMPLE
    .\Diagnose-HNS-Ports.ps1

.NOTES
    Author: CosmicBytez IT Operations
    Version: 1.0
    Created: 2026-01-09
#>

#Requires -RunAsAdministrator

$ErrorActionPreference = 'Continue'

Write-Host "`n====== HNS Network Diagnostics for Business Central ======`n" -ForegroundColor Cyan

# Check 1: Docker running state
Write-Host "[1] Docker Service Status" -ForegroundColor Yellow
$dockerService = Get-Service docker -ErrorAction SilentlyContinue
if ($dockerService) {
    Write-Host "   Status: $($dockerService.Status)" -ForegroundColor $(if ($dockerService.Status -eq 'Running') { 'Green' } else { 'Red' })
} else {
    Write-Host "   Docker service not found!" -ForegroundColor Red
}

# Check 2: HNS service status
Write-Host "`n[2] HNS Service Status" -ForegroundColor Yellow
$hnsService = Get-Service hns -ErrorAction SilentlyContinue
if ($hnsService) {
    Write-Host "   Status: $($hnsService.Status)" -ForegroundColor $(if ($hnsService.Status -eq 'Running') { 'Green' } else { 'Red' })
} else {
    Write-Host "   HNS service not found!" -ForegroundColor Red
}

# Check 3: NAT networks
Write-Host "`n[3] Docker NAT Network" -ForegroundColor Yellow
$natNetwork = docker network ls --filter "name=nat" --format "{{.Name}}" 2>$null
if ($natNetwork) {
    Write-Host "   NAT network exists: $natNetwork" -ForegroundColor Green

    # Get network details
    $natDetails = docker network inspect nat 2>$null | ConvertFrom-Json
    if ($natDetails) {
        $containers = $natDetails.Containers
        if ($containers) {
            Write-Host "   Containers on NAT network: $($containers.Count)" -ForegroundColor Cyan
            foreach ($containerId in $containers.PSObject.Properties.Name) {
                $container = $containers.$containerId
                Write-Host "      - $($container.Name)" -ForegroundColor Gray
            }
        } else {
            Write-Host "   No containers on NAT network" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "   NAT network not found!" -ForegroundColor Red
}

# Check 4: HNS Endpoints (all)
Write-Host "`n[4] HNS Endpoints" -ForegroundColor Yellow
if (Get-Command Get-HnsEndpoint -ErrorAction SilentlyContinue) {
    $allEndpoints = Get-HnsEndpoint -ErrorAction SilentlyContinue
    if ($allEndpoints) {
        Write-Host "   Total HNS endpoints: $($allEndpoints.Count)" -ForegroundColor Cyan

        $bcEndpoints = $allEndpoints | Where-Object { $_.Name -like "*bcserver*" }
        if ($bcEndpoints) {
            Write-Host "   BC-related endpoints: $($bcEndpoints.Count)" -ForegroundColor Yellow
            foreach ($ep in $bcEndpoints) {
                Write-Host "      - $($ep.Name) (ID: $($ep.Id))" -ForegroundColor Gray
            }
        } else {
            Write-Host "   No BC-related endpoints found" -ForegroundColor Green
        }

        # Check for orphaned endpoints (no matching container)
        $runningContainers = docker ps -a --format "{{.Names}}" 2>$null
        $orphanedEndpoints = $allEndpoints | Where-Object {
            $epName = $_.Name
            $runningContainers -notcontains $epName
        }
        if ($orphanedEndpoints) {
            Write-Host "   Orphaned endpoints (no container): $($orphanedEndpoints.Count)" -ForegroundColor Red
            foreach ($ep in $orphanedEndpoints | Select-Object -First 10) {
                Write-Host "      - $($ep.Name)" -ForegroundColor Red
            }
            if ($orphanedEndpoints.Count -gt 10) {
                Write-Host "      ... and $($orphanedEndpoints.Count - 10) more" -ForegroundColor Red
            }
        } else {
            Write-Host "   No orphaned endpoints detected" -ForegroundColor Green
        }
    } else {
        Write-Host "   No HNS endpoints found" -ForegroundColor Green
    }
} else {
    Write-Host "   HNS module not available" -ForegroundColor Red
}

# Check 5: NAT Static Mappings
Write-Host "`n[5] NAT Static Mappings (Port 8000-9999)" -ForegroundColor Yellow
$natMappings = Get-NetNatStaticMapping -ErrorAction SilentlyContinue
if ($natMappings) {
    $bcMappings = $natMappings | Where-Object {
        ($_.ExternalPort -ge 8000 -and $_.ExternalPort -le 9999) -or
        ($_.InternalPort -ge 8000 -and $_.InternalPort -le 9999)
    }
    if ($bcMappings) {
        Write-Host "   BC port mappings: $($bcMappings.Count)" -ForegroundColor Yellow
        foreach ($mapping in $bcMappings | Select-Object -First 20) {
            Write-Host "      - External:$($mapping.ExternalPort) -> Internal:$($mapping.InternalPort)" -ForegroundColor Gray
        }
        if ($bcMappings.Count -gt 20) {
            Write-Host "      ... and $($bcMappings.Count - 20) more" -ForegroundColor Gray
        }
    } else {
        Write-Host "   No BC port mappings found" -ForegroundColor Green
    }
} else {
    Write-Host "   No NAT static mappings found" -ForegroundColor Green
}

# Check 6: Windows Excluded Port Ranges
Write-Host "`n[6] Windows Excluded Port Ranges" -ForegroundColor Yellow
$excludedOutput = netsh interface ipv4 show excludedportrange protocol=tcp 2>&1
if ($LASTEXITCODE -eq 0) {
    $bcPortsExcluded = @()
    $excludedRanges = @()
    foreach ($line in $excludedOutput -split "`n") {
        if ($line -match '^\s*(\d+)\s+(\d+)\s*$') {
            $start = [int]$Matches[1]
            $end = [int]$Matches[2]

            # Check if BC port range (8000-9999) overlaps with excluded range
            if (($start -ge 8000 -and $start -le 9999) -or ($end -ge 8000 -and $end -le 9999) -or ($start -lt 8000 -and $end -gt 9999)) {
                $bcPortsExcluded += "$start-$end"
            }
        }
    }

    if ($bcPortsExcluded) {
        Write-Host "   Excluded ranges overlapping BC ports (8000-9999): $($bcPortsExcluded.Count)" -ForegroundColor Red
        foreach ($range in $bcPortsExcluded) {
            Write-Host "      - $range" -ForegroundColor Red
        }
    } else {
        Write-Host "   No excluded port ranges in BC port range (8000-9999)" -ForegroundColor Green
    }
} else {
    Write-Host "   Could not retrieve excluded port ranges" -ForegroundColor Red
}

# Check 7: Listening ports in BC range
Write-Host "`n[7] Active TCP Listeners (Port 8000-9999)" -ForegroundColor Yellow
$netstatOutput = netstat -ano | Select-String "LISTENING" | Select-String ":8\d{3}\s|:9\d{3}\s"
if ($netstatOutput) {
    Write-Host "   Active BC port listeners: $($netstatOutput.Count)" -ForegroundColor Yellow
    foreach ($line in $netstatOutput | Select-Object -First 10) {
        Write-Host "      $line" -ForegroundColor Gray
    }
    if ($netstatOutput.Count -gt 10) {
        Write-Host "      ... and $($netstatOutput.Count - 10) more" -ForegroundColor Gray
    }
} else {
    Write-Host "   No active listeners on BC ports" -ForegroundColor Green
}

# Check 8: BC Containers
Write-Host "`n[8] Business Central Containers" -ForegroundColor Yellow
$bcContainers = docker ps -a --filter "name=bcserver" --format "{{.Names}}\t{{.Status}}\t{{.Ports}}" 2>$null
if ($bcContainers) {
    Write-Host "   BC containers found:" -ForegroundColor Cyan
    foreach ($container in $bcContainers -split "`n") {
        if ($container.Trim()) {
            Write-Host "      $container" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "   No BC containers found" -ForegroundColor Green
}

# Summary and Recommendations
Write-Host "`n====== Recommendations ======`n" -ForegroundColor Cyan

$issues = @()

if ($orphanedEndpoints -and $orphanedEndpoints.Count -gt 0) {
    $issues += "Found $($orphanedEndpoints.Count) orphaned HNS endpoints - run cleanup script"
}

if ($bcMappings -and $bcMappings.Count -gt 0) {
    $issues += "Found $($bcMappings.Count) NAT static mappings on BC ports - may need cleanup"
}

if ($bcPortsExcluded) {
    $issues += "Windows has excluded port ranges in BC port range (8000-9999) - consider using different ports"
}

if ($issues.Count -eq 0) {
    Write-Host "✓ No issues detected - HNS state appears clean" -ForegroundColor Green
} else {
    Write-Host "⚠ Issues detected:" -ForegroundColor Yellow
    foreach ($issue in $issues) {
        Write-Host "  • $issue" -ForegroundColor Yellow
    }

    Write-Host "`nSuggested fix:" -ForegroundColor Cyan
    Write-Host "  1. Run: .\Fix-HNS-State.ps1" -ForegroundColor White
    Write-Host "  2. Retry container deployment" -ForegroundColor White
}

Write-Host "`n====== End of Diagnostics ======`n" -ForegroundColor Cyan
