# Deployment Error Recovery - User Guide

## Overview

BC Docker Manager now includes intelligent error detection and automated recovery for HNS (Host Network Service) issues that commonly prevent container deployment.

## Features

### 🔍 Automatic Error Detection

When a deployment fails, the app automatically analyzes the output to identify HNS-specific errors:

- **Port Conflicts** (0x803b0013) - Orphaned NAT port mappings
- **Endpoint Failures** - HNS endpoints from removed containers
- **NAT Mapping Issues** - Duplicate static mappings
- **Service Problems** - Docker or HNS not running

### 🛠️ One-Click Recovery

Instead of manually running PowerShell scripts, simply click buttons in the UI:

1. **Run Diagnostics** - Scans network state and identifies issues
2. **Clean HNS State** - Removes orphaned endpoints and mappings
3. **Retry Deployment** - Attempts container creation again

### 📊 Network Diagnostics Panel

Proactively check network health before deployment:

- Shows orphaned HNS endpoints
- Lists NAT static mappings on BC ports (8000-9999)
- Checks Windows excluded port ranges
- Displays Docker and HNS service status
- Color-coded issue severity

## Usage Workflow

### When Deployment Fails

1. **Deploy Container**
   ```
   Click "Deploy Container" → Deployment starts
   ```

2. **Error Detected**
   ```
   If HNS error occurs → Red error panel appears automatically
   ```

3. **View Error Details**
   ```
   Panel shows:
   - Error type (e.g., "Port Conflict")
   - Error message
   - Windows error code (e.g., 0x803b0013)
   - Affected ports
   ```

4. **Run Diagnostics** (Optional)
   ```
   Click "Run Diagnostics" → Scan network state
   View full diagnostic output → Identify specific issues
   ```

5. **Clean HNS State**
   ```
   Click "Clean HNS State" → Removes orphaned resources
   Progress shown in real-time → Cleanup completes
   ```

6. **Retry Deployment**
   ```
   Click "Retry Deployment" → Deployment restarts
   Container created successfully!
   ```

### Proactive Diagnostics

Before deploying a container, you can check network health:

1. **Open Diagnostics Panel**
   ```
   Navigate to "Create Container" page
   Click "Show Network Diagnostics"
   ```

2. **Scan Network**
   ```
   Click "Scan Network" → Diagnostics run
   ```

3. **Review Results**
   ```
   Green checkmarks = No issues
   Yellow warnings = Potential conflicts
   Red errors = Must fix before deployment
   ```

4. **Clean if Needed**
   ```
   If issues found → Run cleanup before deployment
   ```

## Error Examples

### Port Conflict Error

**What You See:**
```
Port Conflict Detected
Error Code: 0x803b0013
Port 8080 already exists

Windows HNS (Host Network Service) maintains NAT port mappings for
Docker containers. When a container is removed improperly, these
mappings can persist.
```

**What It Means:**
A previous container was removed but left behind NAT port mappings in Windows. Docker can't create a new container on the same ports.

**How to Fix:**
1. Click "Run Diagnostics" to see orphaned mappings
2. Click "Clean HNS State" to remove them
3. Click "Retry Deployment"

### HNS Endpoint Error

**What You See:**
```
HNS Endpoint Error
Failed to create endpoint on network nat

HNS endpoints are network interfaces for containers. Orphaned
endpoints from improperly removed containers can prevent new
containers from creating network connections.
```

**What It Means:**
Old container network interfaces (HNS endpoints) are blocking new container creation.

**How to Fix:**
1. Click "Clean HNS State" to remove orphaned endpoints
2. Docker will recreate endpoints when you retry
3. Click "Retry Deployment"

## Diagnostic Script Details

### Diagnose-HNS-Ports.ps1

**What it checks:**
- Docker service status
- HNS service status
- Orphaned HNS endpoints
- NAT static mappings (BC ports 8000-9999)
- Windows excluded port ranges
- Active TCP listeners

**Output format:**
```
[1] Docker Service Status
   Status: Running ✓

[2] HNS Service Status
   Status: Running ✓

[3] Docker NAT Network
   NAT network exists: nat ✓

[4] HNS Endpoints
   Total HNS endpoints: 5
   Orphaned endpoints (no container): 2
      - bcserver-old
      - bcserver-test

[5] NAT Static Mappings (Port 8000-9999)
   BC port mappings: 4
      - External:8080 -> Internal:8080
      - External:8443 -> Internal:443

⚠ Issues detected:
  • Found 2 orphaned HNS endpoints - run cleanup script
  • Found 4 NAT static mappings on BC ports - may need cleanup

Suggested fix:
  1. Run: .\Fix-HNS-State.ps1
  2. Retry container deployment
```

### Fix-HNS-State.ps1

**What it does:**
1. Stops Docker service (temporarily)
2. Stops HNS service
3. Removes ALL NAT static mappings on BC ports (8000-9999)
4. Restarts HNS service
5. Removes ALL orphaned HNS endpoints
6. Restarts Docker service
7. Waits for Docker to be responsive
8. Verifies cleanup success

**Progress output:**
```
[INFO] Stopping Docker service...
[✓] Docker service stopped

[INFO] Stopping HNS service...
[✓] HNS service stopped

[INFO] Cleaning NAT static mappings in BC port range (8000-9999)...
[✓] Removed 4 NAT static mappings

[INFO] Starting HNS service...
[✓] HNS service started

[INFO] Cleaning orphaned HNS endpoints...
[✓] Removed 2 HNS endpoints

[INFO] Starting Docker service...
[INFO] Waiting for Docker to become responsive...
..........
[✓] Docker service is ready

Verifying cleanup...
✓ No NAT static mappings in BC port range
✓ No HNS endpoints found

====== Cleanup Complete ======
```

## Tips & Best Practices

### 1. Run as Administrator
HNS cmdlets require administrator privileges. The app will show an error if not elevated.

### 2. Before Deployment
If you frequently encounter port conflicts, run diagnostics before each deployment to catch issues early.

### 3. Understand the Impact
The cleanup script temporarily stops Docker, which stops all running containers. Plan accordingly.

### 4. Safe to Retry
Docker will automatically recreate HNS endpoints when containers start. The cleanup doesn't affect container data.

### 5. View Full Output
Click "View Output" on completed actions to see detailed logs for troubleshooting.

## Troubleshooting

### "Script not allowed" Error
**Cause:** PowerShell script not in whitelist
**Solution:** Ensure diagnostic scripts are in `scripts/` directory

### "Access denied" Error
**Cause:** Not running as administrator
**Solution:** Right-click app → "Run as administrator"

### Cleanup Completes but Error Persists
**Cause:** Different issue (not HNS-related)
**Solution:** Check full deployment output for other error types

### Docker Won't Start After Cleanup
**Cause:** Docker Desktop issue (rare)
**Solution:**
1. Open Docker Desktop manually
2. Wait for it to fully start
3. Retry deployment in app

## Advanced Usage

### Manual Script Execution

If you prefer command-line:

```powershell
# Run diagnostics
.\scripts\Diagnose-HNS-Ports.ps1

# Preview cleanup (no changes)
.\scripts\Fix-HNS-State.ps1 -WhatIf

# Run cleanup with confirmation
.\scripts\Fix-HNS-State.ps1

# Run cleanup without confirmation
.\scripts\Fix-HNS-State.ps1 -Force
```

### Export Diagnostics

To save diagnostic output for support:

1. Click "Scan Network"
2. Click "View Full Diagnostic Output"
3. Copy text from output panel
4. Paste into text file or support ticket

## FAQ

**Q: Will cleanup delete my containers?**
A: No. It only removes orphaned network resources. Your containers and their data are safe.

**Q: How long does cleanup take?**
A: Usually 30-60 seconds (Docker restart takes the longest).

**Q: Can I run cleanup while containers are running?**
A: Yes, but it will stop all containers temporarily. They'll restart automatically.

**Q: What if I have non-BC containers?**
A: The cleanup only touches BC port range (8000-9999). Other containers are unaffected.

**Q: Do I need to run cleanup every time?**
A: No. Only when HNS errors occur. Proper container removal prevents issues.

## Getting Help

If recovery doesn't work:

1. Copy full deployment output
2. Copy diagnostic output
3. Note Windows version and Docker version
4. Contact support with:
   - Error screenshots
   - Full output logs
   - Steps to reproduce

## Summary

The HNS error recovery system makes deployment failures easy to fix:

1. ✅ **Automatic detection** - No manual log analysis
2. ✅ **One-click recovery** - No PowerShell knowledge needed
3. ✅ **Educational** - Learn what went wrong
4. ✅ **Proactive** - Catch issues before deployment
5. ✅ **Safe** - Non-destructive diagnostics, optional cleanup
