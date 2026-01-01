<#
.SYNOPSIS
    Business Central Container Deployment Helper v3.7

.DESCRIPTION
    Interactive deployment script for Microsoft Dynamics 365 Business Central containers.
    Features version selection, automated backups, and test kit installation.

.REQUIREMENTS
    - Windows 11 Pro/Enterprise or Windows Server with Hyper-V
    - Docker Engine installed and running
    - BcContainerHelper PowerShell module
    - Administrator privileges
    - Internet access for artifact downloads
    - Minimum 16GB RAM (32GB+ recommended)

.FEATURES
    - Version selection menu (BC 13-27, Latest, Next Minor, Next Major)
    - Version-based container naming (bcserver-bc25, bcserver-latest, etc.)
    - Version-based port allocation (prevents conflicts between versions)
    - Automated daily backup with scheduled task (02:00, 7-day retention)
    - Testing kits auto-install (except preview builds)

.PROCESS
    1. Verify prerequisites (Docker, BcContainerHelper)
    2. Display version selection menu
    3. Prompt for container credentials
    4. Calculate version-specific ports
    5. Create BC container with configuration
    6. Setup automated daily backup task
    7. Install test toolkit (non-preview builds)
    8. Display access URLs

.EXAMPLE
    .\Install-BC-Helper.ps1

.NOTES
    Author: CosmicBytez IT Operations
    Version: 3.6
    Last Updated: 2025-12
#>

[CmdletBinding()]
param(
    # BC Version - can be 13-27, Latest, NextMinor, or NextMajor
    [Parameter(Mandatory=$false)]
    [ValidateSet('13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','Latest','NextMinor','NextMajor')]
    [string]$Version,

    # Container name - must start with bcserver-
    [Parameter(Mandatory=$false)]
    [string]$ContainerName,

    # Authentication type
    [Parameter(Mandatory=$false)]
    [ValidateSet('Windows','NavUserPassword')]
    [string]$Auth = 'NavUserPassword',

    # Username for NavUserPassword auth
    [Parameter(Mandatory=$false)]
    [string]$Username = 'admin',

    # Password for NavUserPassword auth
    [Parameter(Mandatory=$false)]
    [string]$Password,

    # Install test toolkit
    [Parameter(Mandatory=$false)]
    [switch]$InstallTestToolkit,

    # Enable scheduled backups
    [Parameter(Mandatory=$false)]
    [switch]$EnableScheduledBackups,

    # Non-interactive mode (for app deployment)
    [Parameter(Mandatory=$false)]
    [switch]$NonInteractive
)

$ErrorActionPreference = 'Stop'
$scriptVersion = "3.7"

#region Configuration
$backupRootPath = "C:\BCBackups"
$scriptsPath = "C:\Scripts"
$backupRetentionDays = 7
$backupTime = "02:00"
$defaultMemoryLimit = "8G"
$country = "us"
#endregion

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
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

function Test-Prerequisites {
    Write-Log "Checking prerequisites..."

    # Check for Administrator privileges
    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if (-not $isAdmin) {
        throw "This script requires Administrator privileges. Please run PowerShell as Administrator."
    }
    Write-Log "Administrator privileges: OK" -Level SUCCESS

    # Check Docker
    try {
        $dockerVersion = docker version --format '{{.Server.Version}}' 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Docker is not running"
        }
        Write-Log "Docker Engine: $dockerVersion" -Level SUCCESS
    }
    catch {
        throw "Docker is not installed or not running. Please install Docker Engine first."
    }

    # Check BcContainerHelper module
    $bcModule = Get-Module -ListAvailable -Name BcContainerHelper | Select-Object -First 1
    if (-not $bcModule) {
        Write-Log "BcContainerHelper module not found. Installing..." -Level WARN
        try {
            Install-Module BcContainerHelper -Force -Scope AllUsers
            Import-Module BcContainerHelper -Force
            Write-Log "BcContainerHelper installed successfully" -Level SUCCESS
        }
        catch {
            throw "Failed to install BcContainerHelper module: $($_.Exception.Message)"
        }
    }
    else {
        Import-Module BcContainerHelper -Force
        Write-Log "BcContainerHelper: v$($bcModule.Version)" -Level SUCCESS
    }

    return $true
}

function Get-BCVersionSelection {
    $versions = @{
        1  = @{ Version = "13"; Name = "BC 13 (Legacy)"; Preview = $false }
        2  = @{ Version = "14"; Name = "BC 14 (Legacy)"; Preview = $false }
        3  = @{ Version = "15"; Name = "BC 15"; Preview = $false }
        4  = @{ Version = "16"; Name = "BC 16"; Preview = $false }
        5  = @{ Version = "17"; Name = "BC 17"; Preview = $false }
        6  = @{ Version = "18"; Name = "BC 18"; Preview = $false }
        7  = @{ Version = "19"; Name = "BC 19"; Preview = $false }
        8  = @{ Version = "20"; Name = "BC 20"; Preview = $false }
        9  = @{ Version = "21"; Name = "BC 21"; Preview = $false }
        10 = @{ Version = "22"; Name = "BC 22"; Preview = $false }
        11 = @{ Version = "23"; Name = "BC 23"; Preview = $false }
        12 = @{ Version = "24"; Name = "BC 24"; Preview = $false }
        13 = @{ Version = "25"; Name = "BC 25 (LTS)"; Preview = $false }
        14 = @{ Version = "26"; Name = "BC 26"; Preview = $false }
        15 = @{ Version = "27"; Name = "BC 27 (Current)"; Preview = $false }
        16 = @{ Version = "Latest"; Name = "Latest"; Preview = $false }
        17 = @{ Version = "NextMinor"; Name = "Next Minor (Preview)"; Preview = $true }
        18 = @{ Version = "NextMajor"; Name = "Next Major (Preview)"; Preview = $true }
    }

    Write-Host ""
    Write-Host "====== Business Central Container Setup (v$scriptVersion) ======" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Select BC Version:" -ForegroundColor Yellow

    foreach ($key in ($versions.Keys | Sort-Object)) {
        $v = $versions[$key]
        $prefix = if ($key -lt 10) { " " } else { "" }
        Write-Host "  $prefix$key. $($v.Name)"
    }

    Write-Host ""
    $selection = Read-Host "Enter selection (1-18)"

    if (-not $versions.ContainsKey([int]$selection)) {
        throw "Invalid selection. Please enter a number between 1 and 18."
    }

    return $versions[[int]$selection]
}

function Get-VersionPorts {
    param(
        [string]$Version
    )

    # Calculate version-specific ports to avoid conflicts
    # Port ranges chosen to avoid Windows reserved/excluded port ranges
    # Use lower port numbers that are less likely to conflict with Hyper-V dynamic ports
    $baseVersion = switch ($Version) {
        "Latest"    { 99 }
        "NextMinor" { 98 }
        "NextMajor" { 97 }
        default     { [int]$Version }
    }

    return @{
        WebPort   = 8500 + $baseVersion      # Was 54500 (often in excluded range)
        DevPort   = 7000 + $baseVersion      # Was 8000
        HttpsPort = 9400 + $baseVersion      # Was 44300 (often in excluded range)
        SoapPort  = 6000 + ($baseVersion * 10)  # Was 7047 base
        ODataPort = 6100 + ($baseVersion * 10)  # Was 7048 base
    }
}

function Clear-OrphanedNatPorts {
    param(
        [hashtable]$Ports,
        [string]$ContainerName
    )

    Write-Log "Checking for orphaned NAT port reservations..."

    # Collect all ports we need to check
    $portsToCheck = @($Ports.WebPort, $Ports.DevPort, $Ports.HttpsPort, $Ports.SoapPort, $Ports.ODataPort) | Where-Object { $_ }

    # Step 0: Check for Windows excluded port ranges (reserved by Hyper-V, WinNAT, etc.)
    Write-Log "Checking Windows excluded port ranges..."
    try {
        $excludedRangesOutput = netsh interface ipv4 show excludedportrange protocol=tcp 2>&1
        if ($LASTEXITCODE -eq 0 -and $excludedRangesOutput) {
            # Parse the excluded port ranges
            $excludedRanges = @()
            foreach ($line in $excludedRangesOutput -split "`n") {
                # Lines look like: "    50000    50059"
                if ($line -match '^\s*(\d+)\s+(\d+)\s*$') {
                    $excludedRanges += @{
                        Start = [int]$Matches[1]
                        End   = [int]$Matches[2]
                    }
                }
            }

            # Check if any of our required ports fall within excluded ranges
            $portsInExcludedRange = @()
            foreach ($port in $portsToCheck) {
                foreach ($range in $excludedRanges) {
                    if ($port -ge $range.Start -and $port -le $range.End) {
                        $portsInExcludedRange += @{
                            Port       = $port
                            RangeStart = $range.Start
                            RangeEnd   = $range.End
                        }
                        break
                    }
                }
            }

            if ($portsInExcludedRange.Count -gt 0) {
                Write-Log "WARNING: The following ports are in Windows excluded port ranges:" -Level WARN
                foreach ($portInfo in $portsInExcludedRange) {
                    Write-Log "  Port $($portInfo.Port) is in excluded range $($portInfo.RangeStart)-$($portInfo.RangeEnd)" -Level WARN
                }
                Write-Log "These ports are reserved at the OS level and cannot be used by Docker." -Level WARN
                Write-Log "Consider using different port numbers or releasing the excluded ranges." -Level WARN
            }
            else {
                Write-Log "No ports conflict with Windows excluded port ranges" -Level SUCCESS
            }
        }
    }
    catch {
        Write-Log "Could not check excluded port ranges: $($_.Exception.Message)" -Level WARN
    }

    try {
        # Step 1: Check if any of our required ports are actually in use
        $portsInUse = @()
        foreach ($port in $portsToCheck) {
            # Check via netstat for TCP listeners
            $netstatResult = netstat -ano | Select-String ":$port\s" 2>$null
            if ($netstatResult) {
                $portsInUse += $port
                Write-Log "Port $port is currently in use (netstat)" -Level WARN
            }

            # Also check via Test-NetConnection (TCP connect test)
            $tcpTest = Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
            if ($tcpTest.TcpTestSucceeded) {
                if ($port -notin $portsInUse) { $portsInUse += $port }
                Write-Log "Port $port responds to TCP connection" -Level WARN
            }
        }

        # Step 2: Force remove ANY container with this name (all states including 'created')
        Write-Log "Checking for existing containers named: $ContainerName"
        $existingContainer = docker ps -a --filter "name=$ContainerName" --format "{{.Names}}" 2>$null
        if ($existingContainer) {
            foreach ($container in $existingContainer -split "`n") {
                if ($container -and $container.Trim()) {
                    Write-Log "Force removing container: $($container.Trim())" -Level WARN
                    docker rm -f $container.Trim() 2>$null
                }
            }
            Start-Sleep -Seconds 2
        }

        # Step 3: Clean up ALL bcserver containers in ANY state (running, exited, created, dead)
        Write-Log "Checking for any bcserver containers in any state..."
        $allBcContainers = docker ps -a --filter "name=bcserver" --format "{{.Names}} {{.Status}}" 2>$null
        if ($allBcContainers) {
            foreach ($line in $allBcContainers -split "`n") {
                if ($line -and $line.Trim()) {
                    $containerName = ($line.Trim() -split " ")[0]
                    Write-Log "Removing bcserver container: $containerName (Status: $line)" -Level WARN
                    docker rm -f $containerName 2>$null
                }
            }
            Start-Sleep -Seconds 2
        }

        # Step 3b: Also remove any containers in 'created' state (failed to start)
        $createdContainers = docker ps -a --filter "status=created" --format "{{.Names}}" 2>$null
        if ($createdContainers) {
            foreach ($container in $createdContainers -split "`n") {
                if ($container -and $container.Trim()) {
                    Write-Log "Removing 'created' state container: $($container.Trim())" -Level WARN
                    docker rm -f $container.Trim() 2>$null
                }
            }
        }

        # Step 4: Prune unused Docker networks
        Write-Log "Pruning unused Docker networks..."
        docker network prune -f 2>$null

        # Step 5: Clean up NAT static mappings (releases port bindings at OS level)
        Write-Log "Cleaning up NAT static mappings..."
        try {
            $natMappings = Get-NetNatStaticMapping -ErrorAction SilentlyContinue
            if ($natMappings) {
                foreach ($port in $portsToCheck) {
                    $stuckMappings = $natMappings | Where-Object { $_.ExternalPort -eq $port -or $_.InternalPort -eq $port }
                    foreach ($mapping in $stuckMappings) {
                        Write-Log "Removing NAT static mapping for port $($mapping.ExternalPort)" -Level WARN
                        Remove-NetNatStaticMapping -StaticMappingID $mapping.StaticMappingID -ErrorAction SilentlyContinue
                    }
                }
            }
        }
        catch {
            Write-Log "NAT static mapping cleanup skipped: $($_.Exception.Message)" -Level WARN
        }

        # Step 6: If HNS module is available, clean up endpoints
        if (Get-Command Get-HnsEndpoint -ErrorAction SilentlyContinue) {
            try {
                $hnsEndpoints = Get-HnsEndpoint -ErrorAction SilentlyContinue
                if ($hnsEndpoints) {
                    $orphanedEndpoints = $hnsEndpoints | Where-Object {
                        $_.Name -like "*$ContainerName*" -or $_.Name -like "*bcserver*"
                    }
                    foreach ($endpoint in $orphanedEndpoints) {
                        Write-Log "Removing orphaned HNS endpoint: $($endpoint.Name)" -Level WARN
                        Remove-HnsEndpoint -Id $endpoint.Id -ErrorAction SilentlyContinue
                    }
                }
            }
            catch {
                Write-Log "HNS endpoint cleanup skipped: $($_.Exception.Message)" -Level WARN
            }
        }

        # Step 7: If ports are still stuck, restart WinNAT service (releases OS-level port reservations)
        if ($portsInUse.Count -gt 0) {
            Write-Log "Ports still in use after cleanup - restarting WinNAT service..." -Level WARN
            try {
                # Stop WinNAT first
                $winnatService = Get-Service -Name winnat -ErrorAction SilentlyContinue
                if ($winnatService) {
                    Stop-Service -Name winnat -Force -ErrorAction SilentlyContinue
                    Start-Sleep -Seconds 2
                    Start-Service -Name winnat -ErrorAction SilentlyContinue
                    Start-Sleep -Seconds 2
                    Write-Log "WinNAT service restarted" -Level SUCCESS
                }
            }
            catch {
                Write-Log "WinNAT restart failed: $($_.Exception.Message)" -Level WARN
            }
        }

        # Step 8: Only restart services if ports are actually stuck
        # IMPORTANT: Restarting HNS breaks WSL networking, so only do this as last resort
        if ($portsInUse.Count -gt 0) {
            Write-Log "Ports still in use after cleanup - attempting service restart as last resort..." -Level WARN
            Write-Log "WARNING: This may temporarily disrupt WSL networking" -Level WARN

            try {
                # Stop Docker first (uses HNS)
                $dockerService = Get-Service -Name docker -ErrorAction SilentlyContinue
                if ($dockerService -and $dockerService.Status -eq 'Running') {
                    Stop-Service -Name docker -Force -ErrorAction Stop
                    Write-Log "Docker service stopped" -Level INFO
                    Start-Sleep -Seconds 5

                    # Restart HNS only after Docker is stopped
                    Restart-Service hns -Force -ErrorAction SilentlyContinue
                    Write-Log "HNS service restarted" -Level INFO
                    Start-Sleep -Seconds 3

                    # Start Docker service
                    Start-Service -Name docker -ErrorAction Stop
                    Write-Log "Docker service starting..." -Level INFO
                    Start-Sleep -Seconds 10

                    # Wait for Docker to be responsive
                    $retryCount = 0
                    $maxRetries = 12
                    while ($retryCount -lt $maxRetries) {
                        $dockerCheck = docker info 2>$null
                        if ($LASTEXITCODE -eq 0) {
                            Write-Log "Docker service restarted successfully" -Level SUCCESS
                            break
                        }
                        $retryCount++
                        Write-Log "Waiting for Docker to become responsive... ($retryCount/$maxRetries)" -Level INFO
                        Start-Sleep -Seconds 5
                    }

                    if ($retryCount -ge $maxRetries) {
                        Write-Log "Docker service may not be fully responsive yet" -Level WARN
                    }
                }
            }
            catch {
                Write-Log "Service restart failed: $($_.Exception.Message)" -Level ERROR
                Write-Log "You may need to restart Docker manually" -Level WARN
            }
        }
        else {
            Write-Log "No stuck ports detected - skipping service restart" -Level SUCCESS
        }

        # Step 9: Final verification
        $finalStuckPorts = @()
        foreach ($port in $portsToCheck) {
            $tcpTest = Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
            if ($tcpTest.TcpTestSucceeded) {
                $finalStuckPorts += $port
            }
        }

        if ($finalStuckPorts.Count -gt 0) {
            Write-Log "WARNING: Some ports may still be in use: $($finalStuckPorts -join ', ')" -Level WARN
            Write-Log "If deployment fails, a system reboot may be required" -Level WARN
        }
        else {
            Write-Log "NAT port cleanup completed - all ports are available" -Level SUCCESS
        }
    }
    catch {
        Write-Log "NAT cleanup error: $($_.Exception.Message)" -Level ERROR
        # Re-throw critical errors, continue for warnings
        if ($_.Exception.Message -like "*restart Docker*") {
            throw
        }
    }
}

function Get-ContainerName {
    param(
        [string]$Version
    )

    $suffix = switch ($Version) {
        "Latest"    { "latest" }
        "NextMinor" { "nextminor" }
        "NextMajor" { "nextmajor" }
        default     { "bc$Version" }
    }

    return "bcserver-$suffix"
}

function Get-ArtifactUrl {
    param(
        [string]$Version,
        [string]$Country = "us"
    )

    $params = @{
        type    = "Sandbox"
        country = $Country
        select  = "Latest"
    }

    switch ($Version) {
        "Latest" {
            # Get latest stable version
        }
        "NextMinor" {
            $params.select = "NextMinor"
        }
        "NextMajor" {
            $params.select = "NextMajor"
        }
        default {
            $params.version = $Version
        }
    }

    return Get-BcArtifactUrl @params
}

function New-BCContainerDeployment {
    param(
        [string]$ContainerName,
        [string]$ArtifactUrl,
        [PSCredential]$Credential,
        [hashtable]$Ports,
        [bool]$IncludeTestToolkit,
        [string]$MemoryLimit = "8G"
    )

    Write-Log "Creating container: $ContainerName"
    Write-Log "Artifact URL: $ArtifactUrl"
    Write-Log "Ports - Web: $($Ports.WebPort), Dev: $($Ports.DevPort), HTTPS: $($Ports.HttpsPort)"

    $containerParams = @{
        containerName              = $ContainerName
        accept_eula                = $true
        auth                       = "NavUserPassword"
        credential                 = $Credential
        artifactUrl                = $ArtifactUrl
        isolation                  = "hyperv"
        memoryLimit                = $MemoryLimit
        updateHosts                = $true
        useBestContainerOS         = $true
        assignPremiumPlan          = $true
        WebClientPort              = $Ports.WebPort
        FileSharePort              = $Ports.DevPort
        ManagementServicesPort     = $Ports.SoapPort
        ClientServicesPort         = $Ports.ODataPort
        enableTaskScheduler        = $true
        publishPorts               = @($Ports.WebPort, $Ports.DevPort, $Ports.HttpsPort, $Ports.SoapPort, $Ports.ODataPort)
        additionalParameters       = @("--restart=unless-stopped", "-p $($Ports.HttpsPort):443")
    }

    if ($IncludeTestToolkit) {
        $containerParams.includeTestToolkit = $true
        $containerParams.includeTestLibrariesOnly = $true
        $containerParams.includePerformanceToolkit = $true
        Write-Log "Test toolkit will be included" -Level INFO
    }

    # Try deployment with retry on port conflict
    $maxRetries = 2
    $retryCount = 0
    $lastError = $null

    while ($retryCount -lt $maxRetries) {
        try {
            New-BcContainer @containerParams
            Write-Log "Container $ContainerName created successfully" -Level SUCCESS
            return  # Success - exit function
        }
        catch {
            $lastError = $_
            $retryCount++

            # Check if it's a port conflict error (be specific to avoid false matches)
            if ($_.Exception.Message -match "0x803b0013|port.*already.*exists|port.*allocated|bind.*address already in use") {
                Write-Log "HNS port conflict detected (attempt $retryCount of $maxRetries)" -Level WARN

                if ($retryCount -lt $maxRetries) {
                    Write-Log "Cleaning up failed container and restarting HNS..." -Level WARN

                    # Force remove the zombie container (ignore errors - BcContainerHelper may have already cleaned up)
                    try {
                        $null = docker rm -f $ContainerName 2>&1
                    } catch {
                        # Container may not exist - that's fine
                    }

                    # Remove any container in 'created' state
                    try {
                        $createdContainers = docker ps -a --filter "status=created" --format "{{.ID}}" 2>$null
                        if ($createdContainers) {
                            foreach ($cid in $createdContainers -split "`n") {
                                if ($cid -and $cid.Trim()) {
                                    $null = docker rm -f $cid.Trim() 2>&1
                                }
                            }
                        }
                    } catch {
                        # Ignore cleanup errors
                    }

                    # HNS port conflicts require restarting Docker/HNS to release ports
                    Write-Log "Restarting Docker and HNS to release stuck ports..." -Level WARN
                    Write-Log "WARNING: This may temporarily disrupt WSL networking" -Level WARN
                    try {
                        Stop-Service docker -Force -ErrorAction SilentlyContinue
                        Start-Sleep -Seconds 3
                        Restart-Service hns -Force -ErrorAction SilentlyContinue
                        Start-Sleep -Seconds 3
                        Start-Service docker -ErrorAction SilentlyContinue

                        # Wait for Docker to be responsive
                        $waitCount = 0
                        while ($waitCount -lt 12) {
                            $dockerCheck = docker info 2>$null
                            if ($LASTEXITCODE -eq 0) { break }
                            $waitCount++
                            Start-Sleep -Seconds 5
                        }
                        Write-Log "Docker service restarted" -Level SUCCESS
                    } catch {
                        Write-Log "Service restart warning: $($_.Exception.Message)" -Level WARN
                    }

                    Write-Log "Retrying container creation..." -Level INFO
                    Start-Sleep -Seconds 5
                }
            }
            else {
                # Non-port error, don't retry
                throw $lastError
            }
        }
    }

    # If we get here, all retries failed
    throw $lastError
}

function New-BackupScheduledTask {
    param(
        [string]$ContainerName,
        [string]$BackupPath,
        [string]$ScriptsPath,
        [int]$RetentionDays,
        [string]$TriggerTime
    )

    Write-Log "Setting up automated backup for $ContainerName..."

    # Create backup directory
    if (-not (Test-Path $BackupPath)) {
        New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null
    }

    # Create scripts directory
    if (-not (Test-Path $ScriptsPath)) {
        New-Item -ItemType Directory -Path $ScriptsPath -Force | Out-Null
    }

    # Create backup script
    $backupScriptPath = Join-Path $ScriptsPath "Backup-$ContainerName.ps1"
    $backupScript = @"
<#
.SYNOPSIS
    Automated backup script for $ContainerName container
.DESCRIPTION
    Created by Install-BC-Helper.ps1 v$scriptVersion
    Runs daily at $TriggerTime with $RetentionDays day retention
#>

`$ErrorActionPreference = 'Stop'
`$containerName = '$ContainerName'
`$backupPath = '$BackupPath'
`$retentionDays = $RetentionDays
`$logFile = Join-Path `$backupPath 'backup_log.txt'

function Write-BackupLog {
    param([string]`$Message)
    `$timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -Path `$logFile -Value "`$timestamp - `$Message"
}

try {
    Import-Module BcContainerHelper -Force

    # Check if container exists and is running
    `$container = docker ps -a --filter "name=`$containerName" --format "{{.Names}}" 2>`$null
    if (-not `$container) {
        Write-BackupLog "Container `$containerName not found - skipping backup"
        exit 0
    }

    # Start container if stopped
    `$running = docker ps --filter "name=`$containerName" --format "{{.Names}}" 2>`$null
    if (-not `$running) {
        Write-BackupLog "Starting container `$containerName for backup..."
        Start-BcContainer -containerName `$containerName
        Start-Sleep -Seconds 30
    }

    `$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
    `$bakFile = Join-Path `$backupPath "`${containerName}_`$timestamp.bak"

    # Create backup using BcContainerHelper
    Backup-BcContainerDatabases -containerName `$containerName -bakFolder `$backupPath

    Write-BackupLog "Backup successful: `$bakFile"

    # Cleanup old backups
    `$oldBackups = Get-ChildItem `$backupPath -Filter '*.bak' |
        Where-Object { `$_.LastWriteTime -lt (Get-Date).AddDays(-`$retentionDays) }

    foreach (`$backup in `$oldBackups) {
        Remove-Item `$backup.FullName -Force
        Write-BackupLog "Removed old backup: `$(`$backup.Name)"
    }

} catch {
    Write-BackupLog "Backup FAILED: `$(`$_.Exception.Message)"
    exit 1
}
"@

    $backupScript | Out-File -FilePath $backupScriptPath -Encoding UTF8 -Force
    Write-Log "Backup script created: $backupScriptPath"

    # Create scheduled task
    $taskName = "BC Container Backup - $ContainerName"

    # Remove existing task if present
    $existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($existingTask) {
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
        Write-Log "Removed existing scheduled task" -Level WARN
    }

    $action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -NoProfile -File `"$backupScriptPath`""
    $trigger = New-ScheduledTaskTrigger -Daily -At $TriggerTime
    $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "Daily BC container database backup for $ContainerName (created by Install-BC-Helper.ps1)" | Out-Null

    Write-Log "Scheduled task created: $taskName (daily at $TriggerTime)" -Level SUCCESS
}

function Show-DeploymentSummary {
    param(
        [string]$ContainerName,
        [hashtable]$Ports,
        [string]$BackupPath
    )

    Write-Host ""
    Write-Host "====== Deployment Complete ======" -ForegroundColor Green
    Write-Host ""
    Write-Host "Container Name: $ContainerName" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Access URLs:" -ForegroundColor Yellow
    Write-Host "  Web Client: https://${ContainerName}:$($Ports.HttpsPort)/BC/"
    Write-Host "  Dev Port:   $($Ports.DevPort)"
    Write-Host ""
    Write-Host "Backup Configuration:" -ForegroundColor Yellow
    Write-Host "  Backup Path: $BackupPath"
    Write-Host "  Schedule:    Daily at $backupTime"
    Write-Host "  Retention:   $backupRetentionDays days"
    Write-Host ""
    Write-Host "Container Commands:" -ForegroundColor Yellow
    Write-Host "  Start:   Start-BcContainer -containerName $ContainerName"
    Write-Host "  Stop:    Stop-BcContainer -containerName $ContainerName"
    Write-Host "  Remove:  Remove-BcContainer -containerName $ContainerName"
    Write-Host ""
}
#endregion

#region Main Script
try {
    # Step 1: Verify prerequisites
    Test-Prerequisites | Out-Null

    # Step 2: Get version selection (interactive or from parameter)
    if ($NonInteractive -and $Version) {
        # Non-interactive mode - use provided parameters
        $versionInfo = @{
            Version = $Version
            Name = switch ($Version) {
                "Latest"    { "Latest" }
                "NextMinor" { "Next Minor (Preview)" }
                "NextMajor" { "Next Major (Preview)" }
                default     { "BC $Version" }
            }
            Preview = ($Version -eq "NextMinor" -or $Version -eq "NextMajor")
        }
        Write-Log "Non-interactive mode: Using version $($versionInfo.Name)"
    }
    elseif ($Version) {
        # Version provided via parameter but interactive mode
        $versionInfo = @{
            Version = $Version
            Name = switch ($Version) {
                "Latest"    { "Latest" }
                "NextMinor" { "Next Minor (Preview)" }
                "NextMajor" { "Next Major (Preview)" }
                default     { "BC $Version" }
            }
            Preview = ($Version -eq "NextMinor" -or $Version -eq "NextMajor")
        }
        Write-Log "Using version from parameter: $($versionInfo.Name)"
    }
    else {
        # Interactive mode - show menu
        $versionInfo = Get-BCVersionSelection
    }
    Write-Log "Selected: $($versionInfo.Name)"

    # Step 3: Get container name and ports
    if ($ContainerName) {
        $containerName = $ContainerName
    }
    else {
        $containerName = Get-ContainerName -Version $versionInfo.Version
    }
    $ports = Get-VersionPorts -Version $versionInfo.Version

    # Check for existing container
    $existingContainer = docker ps -a --filter "name=$containerName" --format "{{.Names}}" 2>$null
    if ($existingContainer) {
        if ($NonInteractive) {
            Write-Log "Container '$containerName' already exists. Removing..." -Level WARN
            Remove-BcContainer -containerName $containerName
            # Clean up any orphaned NAT port reservations after container removal
            Clear-OrphanedNatPorts -Ports $ports -ContainerName $containerName
        }
        else {
            Write-Host ""
            Write-Host "Container '$containerName' already exists." -ForegroundColor Yellow
            $response = Read-Host "Remove existing container? (Y/N)"
            if ($response -eq 'Y' -or $response -eq 'y') {
                Write-Log "Removing existing container..."
                Remove-BcContainer -containerName $containerName
                # Clean up any orphaned NAT port reservations after container removal
                Clear-OrphanedNatPorts -Ports $ports -ContainerName $containerName
            }
            else {
                Write-Log "Deployment cancelled by user" -Level WARN
                exit 0
            }
        }
    }
    else {
        # Even if no container exists, check for orphaned NAT ports from crashed containers
        if ($NonInteractive) {
            Clear-OrphanedNatPorts -Ports $ports -ContainerName $containerName
        }
    }

    # Step 4: Get credentials
    if ($NonInteractive -and $Password) {
        # Create credential from parameters
        $securePassword = ConvertTo-SecureString $Password -AsPlainText -Force
        $credential = New-Object System.Management.Automation.PSCredential ($Username, $securePassword)
        Write-Log "Using credentials from parameters"
    }
    elseif ($Auth -eq 'Windows') {
        # Windows auth - no credentials needed for container, use current user
        $credential = $null
        Write-Log "Using Windows authentication"
    }
    else {
        Write-Host ""
        $credential = Get-Credential -Message "Enter credentials for BC Container admin user"
        if (-not $credential) {
            throw "Credentials are required to create the container"
        }
    }

    # Step 5: Get artifact URL
    Write-Log "Retrieving artifact URL..."
    $artifactUrl = Get-ArtifactUrl -Version $versionInfo.Version -Country $country
    Write-Log "Artifact URL: $artifactUrl"

    # Determine test toolkit installation
    $includeTestToolkit = if ($NonInteractive) {
        $InstallTestToolkit.IsPresent -and (-not $versionInfo.Preview)
    } else {
        -not $versionInfo.Preview
    }

    # Step 6: Confirm deployment (skip in non-interactive mode)
    Write-Host ""
    Write-Host "====== Deployment Configuration ======" -ForegroundColor Cyan
    Write-Host "Container Name: $containerName"
    Write-Host "BC Version:     $($versionInfo.Name)"
    Write-Host "Ports:          Web=$($ports.WebPort), Dev=$($ports.DevPort), HTTPS=$($ports.HttpsPort)"
    Write-Host "Memory Limit:   $defaultMemoryLimit"
    Write-Host "Test Toolkit:   $(if ($includeTestToolkit) { 'Yes' } else { 'No' })"
    Write-Host "Backup:         $(if ($EnableScheduledBackups -or -not $NonInteractive) { "Daily at $backupTime ($backupRetentionDays day retention)" } else { 'Disabled' })"
    Write-Host ""

    if (-not $NonInteractive) {
        $confirm = Read-Host "Proceed with deployment? (Y/N)"
        if ($confirm -ne 'Y' -and $confirm -ne 'y') {
            Write-Log "Deployment cancelled by user" -Level WARN
            exit 0
        }
    }

    # Step 7: Create container
    $containerParams = @{
        ContainerName = $containerName
        ArtifactUrl = $artifactUrl
        Ports = $ports
        IncludeTestToolkit = $includeTestToolkit
        MemoryLimit = $defaultMemoryLimit
    }

    # Add credential if NavUserPassword auth
    if ($credential -and $Auth -eq 'NavUserPassword') {
        $containerParams.Credential = $credential
    }

    New-BCContainerDeployment @containerParams

    # Step 8: Setup automated backup (if enabled)
    if ($EnableScheduledBackups -or (-not $NonInteractive)) {
        $backupPath = Join-Path $backupRootPath $containerName
        New-BackupScheduledTask `
            -ContainerName $containerName `
            -BackupPath $backupPath `
            -ScriptsPath $scriptsPath `
            -RetentionDays $backupRetentionDays `
            -TriggerTime $backupTime
    }
    else {
        Write-Log "Scheduled backups disabled" -Level INFO
    }

    # Step 9: Show summary
    Show-DeploymentSummary -ContainerName $containerName -Ports $ports -BackupPath (Join-Path $backupRootPath $containerName)

    Write-Log "Container deployment completed successfully" -Level SUCCESS
}
catch {
    Write-Log "Deployment failed: $($_.Exception.Message)" -Level ERROR
    Write-Log "Stack trace: $($_.ScriptStackTrace)" -Level ERROR
    exit 1
}
#endregion
