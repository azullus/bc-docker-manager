<#
.SYNOPSIS
    Aggressive HNS state cleanup for resolving port conflict errors

.DESCRIPTION
    This script performs nuclear cleanup of HNS (Host Network Service) state to resolve
    persistent "port already exists (0x803b0013)" errors that prevent BC container deployment.

    It will:
    1. Stop Docker and HNS services
    2. Remove ALL orphaned HNS endpoints
    3. Clear ALL NAT static mappings in BC port range (8000-9999)
    4. Restart services with clean state
    5. Verify cleanup success

.REQUIREMENTS
    - Run as Administrator
    - Docker Desktop installed
    - No critical containers running (will stop Docker temporarily)

.EXAMPLE
    .\Fix-HNS-State.ps1

.EXAMPLE
    .\Fix-HNS-State.ps1 -WhatIf

.NOTES
    Author: CosmicBytez IT Operations
    Version: 1.0
    Created: 2026-01-09

.WARNINGS
    - This will temporarily stop Docker and all running containers
    - Use with caution in production environments
    - Consider running diagnostics first: .\Diagnose-HNS-Ports.ps1
#>

#Requires -RunAsAdministrator

[CmdletBinding(SupportsShouldProcess)]
param(
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

function Write-StatusMessage {
    param(
        [string]$Message,
        [ValidateSet('Info', 'Success', 'Warning', 'Error')]
        [string]$Level = 'Info'
    )

    $color = switch ($Level) {
        'Info'    { 'Cyan' }
        'Success' { 'Green' }
        'Warning' { 'Yellow' }
        'Error'   { 'Red' }
    }

    $prefix = switch ($Level) {
        'Info'    { '[INFO]' }
        'Success' { '[OK]' }
        'Warning' { '[WARN]' }
        'Error'   { '[FAIL]' }
    }

    Write-Host "$prefix $Message" -ForegroundColor $color
}

Write-Host "`n====== HNS State Cleanup for Business Central ======`n" -ForegroundColor Cyan

# Pre-flight checks
if (-not $Force) {
    Write-Host "This script will:" -ForegroundColor Yellow
    Write-Host "  - Stop Docker and HNS services" -ForegroundColor White
    Write-Host "  - Stop all running containers" -ForegroundColor White
    Write-Host "  - Remove orphaned HNS endpoints" -ForegroundColor White
    Write-Host "  - Clear NAT static mappings" -ForegroundColor White
    Write-Host "  - Restart services`n" -ForegroundColor White

    $response = Read-Host "Continue? (Y/N)"
    if ($response -ne 'Y' -and $response -ne 'y') {
        Write-StatusMessage "Cancelled by user" -Level Warning
        exit 0
    }
}

try {
    # Step 1: Check Docker service
    Write-StatusMessage "Checking Docker service status..."
    $dockerService = Get-Service docker -ErrorAction Stop
    $dockerWasRunning = $dockerService.Status -eq 'Running'

    if ($dockerWasRunning) {
        Write-StatusMessage "Docker is running - will be stopped temporarily" -Level Warning
    }

    # Step 2: Stop Docker service
    if ($PSCmdlet.ShouldProcess("Docker service", "Stop")) {
        Write-StatusMessage "Stopping Docker service..."
        Stop-Service -Name docker -Force -ErrorAction Stop
        Start-Sleep -Seconds 5

        $dockerService.Refresh()
        if ($dockerService.Status -eq 'Stopped') {
            Write-StatusMessage "Docker service stopped" -Level Success
        } else {
            throw "Failed to stop Docker service (status: $($dockerService.Status))"
        }
    }

    # Step 3: Stop HNS service
    if ($PSCmdlet.ShouldProcess("HNS service", "Stop")) {
        Write-StatusMessage "Stopping HNS service..."
        Stop-Service -Name hns -Force -ErrorAction Stop
        Start-Sleep -Seconds 3

        $hnsService = Get-Service hns
        if ($hnsService.Status -eq 'Stopped') {
            Write-StatusMessage "HNS service stopped" -Level Success
        } else {
            throw "Failed to stop HNS service (status: $($hnsService.Status))"
        }
    }

    # Step 4: Clean NAT static mappings (while services are stopped)
    if ($PSCmdlet.ShouldProcess("NAT static mappings", "Remove all in BC port range 8000-9999")) {
        Write-StatusMessage "Cleaning NAT static mappings in BC port range (8000-9999)..."

        $natMappings = Get-NetNatStaticMapping -ErrorAction SilentlyContinue
        if ($natMappings) {
            $bcMappings = $natMappings | Where-Object {
                ($_.ExternalPort -ge 8000 -and $_.ExternalPort -le 9999) -or
                ($_.InternalPort -ge 8000 -and $_.InternalPort -le 9999)
            }

            if ($bcMappings) {
                $removedCount = 0
                foreach ($mapping in $bcMappings) {
                    try {
                        Remove-NetNatStaticMapping -StaticMappingID $mapping.StaticMappingID -Confirm:$false -ErrorAction Stop
                        $removedCount++
                    } catch {
                        Write-StatusMessage "Failed to remove mapping for port $($mapping.ExternalPort): $($_.Exception.Message)" -Level Warning
                    }
                }

                Write-StatusMessage "Removed $removedCount NAT static mappings" -Level Success
                Start-Sleep -Seconds 3
            } else {
                Write-StatusMessage "No NAT static mappings found in BC port range" -Level Info
            }
        } else {
            Write-StatusMessage "No NAT static mappings found" -Level Info
        }
    }

    # Step 5: Start HNS service (needed for HNS cmdlets)
    if ($PSCmdlet.ShouldProcess("HNS service", "Start")) {
        Write-StatusMessage "Starting HNS service..."
        Start-Service -Name hns -ErrorAction Stop
        Start-Sleep -Seconds 5

        $hnsService = Get-Service hns
        if ($hnsService.Status -eq 'Running') {
            Write-StatusMessage "HNS service started" -Level Success
        } else {
            throw "Failed to start HNS service (status: $($hnsService.Status))"
        }
    }

    # Step 6: Clean ALL orphaned HNS endpoints
    if ($PSCmdlet.ShouldProcess("HNS endpoints", "Remove all orphaned endpoints")) {
        if (Get-Command Get-HnsEndpoint -ErrorAction SilentlyContinue) {
            Write-StatusMessage "Cleaning orphaned HNS endpoints..."

            $allEndpoints = Get-HnsEndpoint -ErrorAction SilentlyContinue
            if ($allEndpoints) {
                Write-StatusMessage "Found $($allEndpoints.Count) total HNS endpoints" -Level Info

                # Get list of current Docker containers
                $existingContainers = @()
                try {
                    # Docker isn't running yet, so we can't query it
                    # We'll remove ALL endpoints since Docker will recreate them when it starts
                    Write-StatusMessage "Removing ALL HNS endpoints (Docker will recreate as needed)..." -Level Warning

                    $removedCount = 0
                    foreach ($endpoint in $allEndpoints) {
                        try {
                            $endpoint | Remove-HnsEndpoint -ErrorAction Stop
                            $removedCount++
                        } catch {
                            Write-StatusMessage "Failed to remove endpoint $($endpoint.Name): $($_.Exception.Message)" -Level Warning
                        }
                    }

                    Write-StatusMessage "Removed $removedCount HNS endpoints" -Level Success
                    Start-Sleep -Seconds 3
                } catch {
                    Write-StatusMessage "HNS endpoint cleanup warning: $($_.Exception.Message)" -Level Warning
                }
            } else {
                Write-StatusMessage "No HNS endpoints found" -Level Info
            }
        } else {
            Write-StatusMessage "HNS module not available - skipping endpoint cleanup" -Level Warning
        }
    }

    # Step 7: Start Docker service
    if ($PSCmdlet.ShouldProcess("Docker service", "Start")) {
        Write-StatusMessage "Starting Docker service..."
        Start-Service -Name docker -ErrorAction Stop
        Start-Sleep -Seconds 10

        # Wait for Docker to be responsive
        Write-StatusMessage "Waiting for Docker to become responsive..."
        $maxRetries = 12
        $retryCount = 0
        $dockerReady = $false

        while ($retryCount -lt $maxRetries) {
            try {
                $null = docker info 2>&1
                if ($LASTEXITCODE -eq 0) {
                    $dockerReady = $true
                    break
                }
            } catch { }

            Start-Sleep -Seconds 5
            $retryCount++
            Write-Host "." -NoNewline
        }
        Write-Host ""

        if ($dockerReady) {
            Write-StatusMessage "Docker service is ready" -Level Success
        } else {
            Write-StatusMessage "Docker service started but not responsive yet - may need more time" -Level Warning
        }
    }

    # Step 8: Verify cleanup
    Write-StatusMessage "`nVerifying cleanup..."

    # Check NAT mappings
    $natMappings = Get-NetNatStaticMapping -ErrorAction SilentlyContinue
    if ($natMappings) {
        $remainingBcMappings = $natMappings | Where-Object {
            ($_.ExternalPort -ge 8000 -and $_.ExternalPort -le 9999) -or
            ($_.InternalPort -ge 8000 -and $_.InternalPort -le 9999)
        }
        if ($remainingBcMappings) {
            Write-StatusMessage "WARNING: $($remainingBcMappings.Count) NAT mappings still remain in BC port range" -Level Warning
        } else {
            Write-StatusMessage "[OK] No NAT static mappings in BC port range" -Level Success
        }
    } else {
        Write-StatusMessage "[OK] No NAT static mappings found" -Level Success
    }

    # Check HNS endpoints
    if (Get-Command Get-HnsEndpoint -ErrorAction SilentlyContinue) {
        $endpoints = Get-HnsEndpoint -ErrorAction SilentlyContinue
        if ($endpoints) {
            Write-StatusMessage "HNS endpoints: $($endpoints.Count) (Docker may have recreated some)" -Level Info
        } else {
            Write-StatusMessage "[OK] No HNS endpoints found" -Level Success
        }
    }

    Write-Host "`n====== Cleanup Complete ======`n" -ForegroundColor Green
    Write-Host "HNS state has been reset. You can now:" -ForegroundColor White
    Write-Host "  1. Run: .\Diagnose-HNS-Ports.ps1 (verify clean state)" -ForegroundColor Cyan
    Write-Host "  2. Deploy your BC container" -ForegroundColor Cyan
    Write-Host ""

} catch {
    Write-StatusMessage "ERROR: $($_.Exception.Message)" -Level Error
    Write-StatusMessage "Stack trace: $($_.ScriptStackTrace)" -Level Error

    # Try to restart services if they're stopped
    try {
        $hnsService = Get-Service hns
        if ($hnsService.Status -ne 'Running') {
            Write-StatusMessage "Attempting to restart HNS service..." -Level Warning
            Start-Service -Name hns -ErrorAction SilentlyContinue
        }

        $dockerService = Get-Service docker
        if ($dockerService.Status -ne 'Running' -and $dockerWasRunning) {
            Write-StatusMessage "Attempting to restart Docker service..." -Level Warning
            Start-Service -Name docker -ErrorAction SilentlyContinue
        }
    } catch {
        Write-StatusMessage "Could not restart services automatically - please restart manually" -Level Error
    }

    exit 1
}
