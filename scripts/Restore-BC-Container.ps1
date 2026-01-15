<#
.SYNOPSIS
    Business Central Container Restore Script v1.0

.DESCRIPTION
    Restores BC container databases from backup files.
    Supports restoring to existing containers or creating new ones.

.REQUIREMENTS
    - Windows with Docker Engine
    - BcContainerHelper PowerShell module
    - Administrator privileges
    - Valid backup created by Backup-BC-Container.ps1

.PARAMETER ContainerName
    Name of the BC container to restore to (must start with bcserver-)

.PARAMETER BackupPath
    Path to the backup folder or .bak file to restore

.PARAMETER CreateNew
    Create a new container if one doesn't exist

.PARAMETER Force
    Skip confirmation prompts

.EXAMPLE
    .\Restore-BC-Container.ps1 -ContainerName bcserver-bc25 -BackupPath "C:\BCBackups\bcserver-bc25\2025-01-04_120000"

.EXAMPLE
    .\Restore-BC-Container.ps1 -ContainerName bcserver-test -BackupPath "C:\BCBackups\bcserver-bc25\2025-01-04_120000\bcserver-bc25.bak" -CreateNew

.NOTES
    Author: CosmicBytez IT Operations
    Version: 1.0
    Last Updated: 2025-01
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [ValidatePattern('bc')]  # Container name must contain 'bc'
    [string]$ContainerName,

    [Parameter(Mandatory=$true)]
    [string]$BackupPath,

    [Parameter(Mandatory=$false)]
    [switch]$CreateNew,

    [Parameter(Mandatory=$false)]
    [switch]$Force,

    [Parameter(Mandatory=$false)]
    [switch]$Silent
)

$ErrorActionPreference = 'Stop'
$scriptVersion = "1.0"

#region Helper Functions
function Write-Log {
    param(
        [string]$Message,
        [ValidateSet('INFO', 'WARN', 'ERROR', 'SUCCESS')]
        [string]$Level = 'INFO'
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        'INFO'    { 'White' }
        'WARN'    { 'Yellow' }
        'ERROR'   { 'Red' }
        'SUCCESS' { 'Green' }
    }

    if (-not $Silent) {
        Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
    }

    # Also output for capture by calling process
    Write-Output "[$timestamp] [$Level] $Message"
}

function Test-ContainerExists {
    param([string]$Name)

    try {
        $container = docker inspect $Name 2>$null | ConvertFrom-Json
        return $null -ne $container
    }
    catch {
        return $false
    }
}

function Test-ContainerRunning {
    param([string]$Name)

    try {
        $state = docker inspect --format '{{.State.Running}}' $Name 2>$null
        return $state -eq 'true'
    }
    catch {
        return $false
    }
}

function Get-BackupInfo {
    param([string]$Path)

    $info = @{
        IsValid = $false
        BackupFolder = $null
        BackupFile = $null
        Manifest = $null
        Config = $null
    }

    # Check if path is a .bak file or folder
    if (Test-Path $Path -PathType Leaf) {
        if ($Path -match '\.bak$') {
            $info.BackupFile = $Path
            $info.BackupFolder = Split-Path $Path -Parent
            $info.IsValid = $true
        }
    }
    elseif (Test-Path $Path -PathType Container) {
        $info.BackupFolder = $Path

        # Look for .bak file in folder
        $bakFiles = Get-ChildItem -Path $Path -Filter "*.bak" | Sort-Object LastWriteTime -Descending
        if ($bakFiles.Count -gt 0) {
            $info.BackupFile = $bakFiles[0].FullName
            $info.IsValid = $true
        }

        # Try to load manifest
        $manifestPath = Join-Path $Path "manifest.json"
        if (Test-Path $manifestPath) {
            $info.Manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
        }

        # Try to load config
        $configPath = Join-Path $Path "container-config.json"
        if (Test-Path $configPath) {
            $info.Config = Get-Content $configPath -Raw | ConvertFrom-Json
        }
    }

    return $info
}
#endregion

#region Main Script
Write-Log "====== BC Container Restore v$scriptVersion ======"
Write-Log "Container: $ContainerName"
Write-Log "Backup Path: $BackupPath"

# Check for Administrator privileges
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Log "This script requires Administrator privileges." -Level ERROR
    exit 1
}

# Import BcContainerHelper
try {
    Import-Module BcContainerHelper -Force -ErrorAction Stop
    Write-Log "BcContainerHelper module loaded" -Level SUCCESS
}
catch {
    Write-Log "Failed to load BcContainerHelper module: $($_.Exception.Message)" -Level ERROR
    exit 1
}

# Validate backup path
if (-not (Test-Path $BackupPath)) {
    Write-Log "Backup path does not exist: $BackupPath" -Level ERROR
    exit 1
}

# Get backup information
$backupInfo = Get-BackupInfo -Path $BackupPath

if (-not $backupInfo.IsValid) {
    Write-Log "Invalid backup path. No .bak file found in: $BackupPath" -Level ERROR
    exit 1
}

Write-Log "Backup file: $($backupInfo.BackupFile)"

if ($backupInfo.Manifest) {
    Write-Log "Backup created: $($backupInfo.Manifest.BackupTimestamp)"
    Write-Log "Original container: $($backupInfo.Manifest.ContainerName)"
}

# Check if container exists
$containerExists = Test-ContainerExists -Name $ContainerName

if (-not $containerExists -and -not $CreateNew) {
    Write-Log "Container '$ContainerName' does not exist. Use -CreateNew to create a new container." -Level ERROR
    exit 1
}

if ($containerExists) {
    Write-Log "Container '$ContainerName' exists" -Level SUCCESS

    # Confirm restore operation
    if (-not $Force -and -not $Silent) {
        Write-Host ""
        Write-Host "WARNING: This will replace the current database in '$ContainerName'" -ForegroundColor Yellow
        $confirm = Read-Host "Are you sure you want to continue? (y/N)"
        if ($confirm -ne 'y' -and $confirm -ne 'Y') {
            Write-Log "Restore cancelled by user" -Level WARN
            exit 0
        }
    }

    # Stop container if running
    if (Test-ContainerRunning -Name $ContainerName) {
        Write-Log "Stopping container..."
        docker stop $ContainerName 2>$null
        Start-Sleep -Seconds 5
    }

    # Start container for restore
    Write-Log "Starting container for restore..."
    docker start $ContainerName 2>$null
    Start-Sleep -Seconds 15

    if (-not (Test-ContainerRunning -Name $ContainerName)) {
        Write-Log "Failed to start container" -Level ERROR
        exit 1
    }
}

if ($CreateNew -and -not $containerExists) {
    Write-Log "Creating new container is not yet implemented in this version." -Level ERROR
    Write-Log "Please create the container first using Install-BC-Helper.ps1" -Level WARN
    exit 1
}

# Perform database restore using BcContainerHelper
try {
    Write-Log "Restoring database from backup..."

    # Copy backup file to container
    $backupFileName = Split-Path $backupInfo.BackupFile -Leaf

    Restore-BcContainerDatabases -containerName $ContainerName -bakFolder $backupInfo.BackupFolder

    Write-Log "Database restore completed" -Level SUCCESS
}
catch {
    Write-Log "Database restore failed: $($_.Exception.Message)" -Level ERROR
    exit 1
}

# Restart container
Write-Log "Restarting container..."
docker restart $ContainerName 2>$null
Start-Sleep -Seconds 20

if (-not (Test-ContainerRunning -Name $ContainerName)) {
    Write-Log "Container failed to restart after restore" -Level ERROR
    exit 1
}

Write-Log "Container restarted successfully" -Level SUCCESS

# Verify container health
Write-Log "Verifying container health..."
Start-Sleep -Seconds 10

try {
    $health = docker inspect --format '{{.State.Health.Status}}' $ContainerName 2>$null
    if ($health -eq 'healthy') {
        Write-Log "Container is healthy" -Level SUCCESS
    }
    elseif ($health) {
        Write-Log "Container health status: $health" -Level WARN
    }
}
catch {
    Write-Log "Could not determine container health" -Level WARN
}

Write-Log "====== Restore Complete ======" -Level SUCCESS
Write-Log "Container '$ContainerName' has been restored from backup"

# Return success object for programmatic access
$result = @{
    Success = $true
    ContainerName = $ContainerName
    BackupFile = $backupInfo.BackupFile
    RestoredAt = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
}

return $result
#endregion
