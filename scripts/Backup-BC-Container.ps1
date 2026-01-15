<#
.SYNOPSIS
    Business Central Container Backup Script v1.0

.DESCRIPTION
    Creates backups of BC container databases and configurations.
    Supports manual and scheduled backups with retention management.

.REQUIREMENTS
    - Windows with Docker Engine
    - BcContainerHelper PowerShell module
    - Administrator privileges
    - Running BC container

.PARAMETER ContainerName
    Name of the BC container to backup (must start with bcserver-)

.PARAMETER BackupPath
    Root path for backup storage (default: C:\BCBackups)

.PARAMETER IncludeTestData
    Include test data in the backup

.PARAMETER RetentionDays
    Number of days to retain backups (default: 7)

.EXAMPLE
    .\Backup-BC-Container.ps1 -ContainerName bcserver-bc25

.EXAMPLE
    .\Backup-BC-Container.ps1 -ContainerName bcserver-latest -BackupPath D:\Backups -RetentionDays 14

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

    [Parameter(Mandatory=$false)]
    [string]$BackupPath = "C:\BCBackups",

    [Parameter(Mandatory=$false)]
    [switch]$IncludeTestData,

    [Parameter(Mandatory=$false)]
    [int]$RetentionDays = 7,

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
#endregion

#region Main Script
Write-Log "====== BC Container Backup v$scriptVersion ======"
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

# Validate container exists and is running
if (-not (Test-ContainerExists -Name $ContainerName)) {
    Write-Log "Container '$ContainerName' does not exist" -Level ERROR
    exit 1
}

if (-not (Test-ContainerRunning -Name $ContainerName)) {
    Write-Log "Container '$ContainerName' is not running. Starting container..." -Level WARN
    docker start $ContainerName 2>$null
    Start-Sleep -Seconds 10

    if (-not (Test-ContainerRunning -Name $ContainerName)) {
        Write-Log "Failed to start container" -Level ERROR
        exit 1
    }
}

Write-Log "Container is running" -Level SUCCESS

# Create backup directory structure
$containerBackupPath = Join-Path $BackupPath $ContainerName
$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$backupFolder = Join-Path $containerBackupPath $timestamp

if (-not (Test-Path $containerBackupPath)) {
    New-Item -ItemType Directory -Path $containerBackupPath -Force | Out-Null
    Write-Log "Created backup directory: $containerBackupPath"
}

New-Item -ItemType Directory -Path $backupFolder -Force | Out-Null
Write-Log "Backup folder: $backupFolder"

# Perform database backup using BcContainerHelper
try {
    Write-Log "Creating database backup..."

    $backupFile = Join-Path $backupFolder "$ContainerName-$timestamp.bak"

    Backup-BcContainerDatabases -containerName $ContainerName -bakFolder $backupFolder

    Write-Log "Database backup completed" -Level SUCCESS
}
catch {
    Write-Log "Database backup failed: $($_.Exception.Message)" -Level ERROR
    exit 1
}

# Export container configuration
try {
    Write-Log "Exporting container configuration..."

    $configFile = Join-Path $backupFolder "container-config.json"

    $config = @{
        ContainerName = $ContainerName
        BackupTimestamp = $timestamp
        ScriptVersion = $scriptVersion
        IncludeTestData = $IncludeTestData.IsPresent
    }

    # Get container inspect data
    $inspectData = docker inspect $ContainerName 2>$null | ConvertFrom-Json
    if ($inspectData) {
        $config.DockerConfig = @{
            Image = $inspectData[0].Config.Image
            Created = $inspectData[0].Created
            Ports = $inspectData[0].NetworkSettings.Ports
            Mounts = $inspectData[0].Mounts
            Environment = ($inspectData[0].Config.Env | Where-Object { $_ -notmatch 'password|secret|key' -or $_ -match '^PATH=' })
        }
    }

    $config | ConvertTo-Json -Depth 5 | Set-Content -Path $configFile -Encoding UTF8
    Write-Log "Configuration exported: $configFile" -Level SUCCESS
}
catch {
    Write-Log "Configuration export failed: $($_.Exception.Message)" -Level WARN
}

# Calculate backup size
$backupSize = (Get-ChildItem -Path $backupFolder -Recurse | Measure-Object -Property Length -Sum).Sum
$backupSizeMB = [math]::Round($backupSize / 1MB, 2)
Write-Log "Backup size: $backupSizeMB MB"

# Cleanup old backups
Write-Log "Cleaning up backups older than $RetentionDays days..."
$cutoffDate = (Get-Date).AddDays(-$RetentionDays)
$oldBackups = Get-ChildItem -Path $containerBackupPath -Directory | Where-Object { $_.CreationTime -lt $cutoffDate }

$removedCount = 0
foreach ($oldBackup in $oldBackups) {
    try {
        Remove-Item -Path $oldBackup.FullName -Recurse -Force
        $removedCount++
        Write-Log "Removed old backup: $($oldBackup.Name)"
    }
    catch {
        Write-Log "Failed to remove old backup: $($oldBackup.Name)" -Level WARN
    }
}

if ($removedCount -gt 0) {
    Write-Log "Removed $removedCount old backup(s)" -Level SUCCESS
}

# Create backup manifest
$manifestFile = Join-Path $backupFolder "manifest.json"
$manifest = @{
    ContainerName = $ContainerName
    BackupTimestamp = $timestamp
    BackupPath = $backupFolder
    BackupSizeMB = $backupSizeMB
    RetentionDays = $RetentionDays
    ScriptVersion = $scriptVersion
    Status = "Completed"
    CompletedAt = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
}
$manifest | ConvertTo-Json | Set-Content -Path $manifestFile -Encoding UTF8

Write-Log "====== Backup Complete ======" -Level SUCCESS
Write-Log "Backup location: $backupFolder"
Write-Log "Backup size: $backupSizeMB MB"

# Return success object for programmatic access
$result = @{
    Success = $true
    BackupPath = $backupFolder
    BackupSizeMB = $backupSizeMB
    Timestamp = $timestamp
    ContainerName = $ContainerName
}

return $result
#endregion
