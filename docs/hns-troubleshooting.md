# HNS Error Detection & Recovery

The app includes comprehensive error detection and recovery for HNS (Host Network Service) issues.

## Error Detection (`lib/hns-error-detector.ts`)

Automatically detects HNS-specific errors from PowerShell output:
- **Port Conflicts** - `0x803b0013` errors from orphaned NAT mappings
- **HNS Endpoint Errors** - Failed endpoint creation
- **NAT Mapping Conflicts** - Duplicate static mappings
- **Service Failures** - Docker/HNS service issues

## Recovery Components

### HNSErrorRecovery (`components/HNSErrorRecovery.tsx`)
Displays when deployment fails with HNS error:
- Shows error type, message, and affected ports
- Provides automated recovery actions (run diagnostics, clean state, retry)
- Displays action output with collapsible details
- Educational tooltips explaining HNS concepts

### NetworkDiagnostics (`components/NetworkDiagnostics.tsx`)
Proactive network health checking:
- Scans for orphaned HNS endpoints
- Lists NAT static mappings in BC port range (8000-9999)
- Checks Windows excluded port ranges
- Displays service status (Docker, HNS)
- Color-coded issue severity (error/warning/info)

## Diagnostic Scripts

Two PowerShell scripts bundled with the app (in `scripts/`):

### Fix-HNS-State.ps1
Aggressive HNS cleanup (requires admin):
1. Stops Docker and HNS services
2. Removes ALL orphaned HNS endpoints
3. Clears NAT static mappings in BC port range
4. Restarts services with clean state
5. Verifies cleanup success

**Usage in app**: Automated via "Clean HNS State" button

### Diagnose-HNS-Ports.ps1
Non-destructive diagnostics (requires admin):
- Lists HNS endpoints (identifies orphaned ones)
- Shows NAT static mappings on BC ports
- Checks Windows excluded port ranges
- Reports active TCP listeners on BC ports
- Provides recommendations

**Usage in app**: "Scan Network" button in diagnostics panel

## Deployment Workflow with Error Handling

1. User clicks "Deploy Container"
2. PowerShell output monitored in real-time
3. On error: `detectHNSError()` analyzes output
4. If HNS error detected: Shows `HNSErrorRecovery` component
5. User clicks "Run Diagnostics" -> Executes `Diagnose-HNS-Ports.ps1`
6. User clicks "Clean HNS State" -> Executes `Fix-HNS-State.ps1 -Force`
7. User clicks "Retry Deployment" -> Re-runs deployment

## Error Patterns

Common HNS errors detected:
```
port already exists (0x803b0013)         -> Port Conflict
failed to create endpoint on network     -> HNS Endpoint Error
nat mapping already exists               -> NAT Mapping Conflict
host network service not running         -> Service Failure
```

## Manual Troubleshooting

### HNS Port Conflicts
**Symptom**: Deployment fails with "port already exists (0x803b0013)"
**Solution**:
1. App shows HNS error recovery panel automatically
2. Click "Run Diagnostics" to identify orphaned endpoints
3. Click "Clean HNS State" to remove orphaned resources
4. Click "Retry Deployment"

**Manual Fix**:
```powershell
# Run diagnostic script
.\scripts\Diagnose-HNS-Ports.ps1

# Run cleanup script
.\scripts\Fix-HNS-State.ps1 -Force
```
