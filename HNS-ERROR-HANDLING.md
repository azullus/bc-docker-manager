# HNS Error Handling & Recovery - Implementation Summary

## Overview

Enhanced the BC Docker Manager Electron app with comprehensive HNS (Host Network Service) error detection and automated recovery workflows for deployment failures.

## Changes Made

### 1. Error Detection System (`lib/hns-error-detector.ts`)

**Purpose**: Analyze PowerShell output to detect HNS-specific errors

**Features**:
- Pattern matching for common HNS errors (port conflicts, endpoint failures, NAT issues)
- Error classification by type and severity
- Automatic port extraction from error messages
- Recovery suggestion generation based on error type
- Windows error code detection (e.g., 0x803b0013)

**Error Types Detected**:
- `port_conflict` - Port already exists (0x803b0013)
- `hns_endpoint` - Failed to create endpoint on network
- `nat_mapping` - NAT mapping already exists
- `service_failure` - HNS/Docker service not running
- `unknown` - Generic network-related errors

### 2. Error Recovery UI (`components/HNSErrorRecovery.tsx`)

**Purpose**: Interactive recovery workflow when HNS errors are detected

**Features**:
- Visual error display with severity indicators
- Automated action buttons (Run Diagnostics, Clean HNS State, Retry)
- Real-time action output with collapsible details
- Educational tooltips explaining HNS concepts
- Action status tracking (running/completed)
- Integrated script execution via IPC

**User Workflow**:
1. Deployment fails with HNS error
2. Component automatically displays with error details
3. User clicks "Run Diagnostics" → Scans network state
4. User clicks "Clean HNS State" → Removes orphaned resources
5. User clicks "Retry Deployment" → Re-runs container creation

### 3. Network Diagnostics Panel (`components/NetworkDiagnostics.tsx`)

**Purpose**: Proactive network health checking before/after deployment

**Features**:
- One-click network scan
- Issue detection and categorization (error/warning/info)
- Full diagnostic output viewer
- Timestamp tracking
- Color-coded issues by severity
- Detailed diagnostic log with syntax highlighting

**Checks Performed**:
- Orphaned HNS endpoints
- NAT static mappings on BC ports (8000-9999)
- Windows excluded port ranges
- Docker/HNS service status
- Active TCP listeners

### 4. Enhanced Create Page (`app/create/page.tsx`)

**Additions**:
- HNS error state tracking
- Automatic error detection on deployment failure
- Conditional rendering of recovery components
- Diagnostics panel toggle
- Error-aware toast notifications

**Flow**:
```
Deploy → Monitor Output → Detect Error → Show Recovery UI → Execute Fix → Retry
```

### 5. IPC Handler Updates (`electron/main.js`)

**Changes**:
- Added `Fix-HNS-State.ps1` to allowed scripts whitelist
- Added `Diagnose-HNS-Ports.ps1` to allowed scripts whitelist
- Scripts validated for security before execution

**Security**:
- Strict script whitelist enforcement
- Path traversal attack prevention
- Password masking in debug output

## Diagnostic Scripts

### Fix-HNS-State.ps1

**Purpose**: Aggressive cleanup of HNS state (requires administrator)

**Actions**:
1. Stops Docker service
2. Stops HNS service
3. Removes ALL NAT static mappings in BC port range (8000-9999)
4. Starts HNS service
5. Removes ALL orphaned HNS endpoints
6. Starts Docker service
7. Waits for Docker to become responsive
8. Verifies cleanup success

**Parameters**:
- `-Force` - Skip confirmation prompt (used by app)
- `-WhatIf` - Preview changes without executing

**Output**: Color-coded status messages with verification results

### Diagnose-HNS-Ports.ps1

**Purpose**: Non-destructive network diagnostics (requires administrator)

**Checks**:
1. Docker service status
2. HNS service status
3. Docker NAT network state
4. HNS endpoints (all + orphaned)
5. NAT static mappings in BC port range
6. Windows excluded port ranges
7. Active TCP listeners on BC ports
8. BC container status

**Output**: Detailed diagnostic report with recommendations

## Error Pattern Examples

### Port Conflict
```
Error: port already exists (0x803b0013)
```
**Detection**: `0x803b0013` error code
**Severity**: Critical
**Recovery**: Clean NAT mappings + retry

### HNS Endpoint Failure
```
Error: failed to create endpoint bcserver-latest on network nat
```
**Detection**: "failed to create endpoint" pattern
**Severity**: Critical
**Recovery**: Remove orphaned endpoints + retry

### NAT Mapping Conflict
```
Error: nat static mapping already exists for port 8080
```
**Detection**: "nat mapping already exists" pattern
**Severity**: Critical
**Recovery**: Clear NAT mappings + retry

## Testing Scenarios

### Scenario 1: Port Conflict During Deployment

1. Deploy BC container
2. Remove container but leave NAT mapping orphaned
3. Attempt to deploy new container with same ports
4. Expected: HNS error recovery panel appears
5. Click "Run Diagnostics" → Shows orphaned mappings
6. Click "Clean HNS State" → Removes orphaned mappings
7. Click "Retry Deployment" → Succeeds

### Scenario 2: Proactive Network Check

1. Navigate to Create Container page
2. Click "Show Network Diagnostics"
3. Click "Scan Network"
4. Expected: Shows current HNS state (clean or issues)
5. If issues found, run cleanup before deployment

### Scenario 3: Service Failure

1. Stop Docker Desktop
2. Attempt to deploy container
3. Expected: Service failure error with suggestion to start Docker

## User Benefits

1. **Automatic Error Detection** - No manual log analysis needed
2. **One-Click Recovery** - Automated cleanup via UI buttons
3. **Educational** - Tooltips explain HNS concepts
4. **Proactive** - Diagnostics available before deployment
5. **Transparent** - Full output visible for advanced users
6. **Safe** - Non-destructive diagnostics, optional cleanup

## Technical Details

### Error Detection Algorithm

```typescript
1. Join PowerShell output into full text
2. Iterate through known error patterns
3. Test regex against output
4. Extract error details (code, ports, message)
5. Generate recovery suggestions based on error type
6. Return HNSError object with severity and suggestions
```

### Recovery Action Execution

```typescript
1. User clicks action button
2. Disable all buttons, show loading state
3. Execute PowerShell script via IPC
4. Stream output to UI in real-time
5. Check exit code on completion
6. Update action status (completed/failed)
7. Store output for viewing
8. Enable buttons for next action
```

### Component Integration

```
DeploymentContext (global state)
  ├── Create Page (error detection)
  │   ├── HNSErrorRecovery (conditional render on error)
  │   └── NetworkDiagnostics (conditional render on toggle)
  └── PowerShell Output Stream (real-time updates)
```

## Files Modified/Created

### Created Files
- `lib/hns-error-detector.ts` - Error detection logic
- `components/HNSErrorRecovery.tsx` - Recovery UI component
- `components/NetworkDiagnostics.tsx` - Diagnostics panel component
- `HNS-ERROR-HANDLING.md` - This documentation

### Modified Files
- `app/create/page.tsx` - Integrated error detection and recovery UI
- `electron/main.js` - Added diagnostic scripts to whitelist
- `.claude/CLAUDE.md` - Added HNS error handling documentation

### Existing Scripts (Now Integrated)
- `scripts/Fix-HNS-State.ps1` - Cleanup script
- `scripts/Diagnose-HNS-Ports.ps1` - Diagnostics script

## Build Configuration

Scripts are automatically bundled via `electron-builder.yml`:
```yaml
extraResources:
  - from: scripts/
    to: scripts/
    filter:
      - "**/*"
```

## Next Steps

1. **Test with real HNS errors** - Deploy containers and intentionally create conflicts
2. **Gather user feedback** - See if suggestions are clear and helpful
3. **Expand error patterns** - Add more HNS error types as discovered
4. **Add telemetry** - Track which errors occur most frequently
5. **Consider auto-cleanup** - Option to automatically run cleanup on error

## Security Considerations

- Scripts run with user's privileges (requires admin)
- Strict whitelist prevents arbitrary script execution
- Passwords masked in all output streams
- File path validation prevents traversal attacks
- Scripts reviewed for safe operations (no data loss)

## Known Limitations

1. **Administrator required** - HNS cmdlets require elevated privileges
2. **Windows only** - HNS is Windows-specific (Linux uses iptables)
3. **Docker restart** - Fix script temporarily stops Docker
4. **Network-specific** - Only detects HNS issues, not other Docker errors

## Future Enhancements

1. **Auto-detect admin status** - Prompt for elevation if needed
2. **Scheduled diagnostics** - Periodic background scans
3. **Export diagnostics** - Save reports for support tickets
4. **Port suggestion** - Recommend available ports on conflict
5. **Rollback capability** - Undo cleanup if issues persist
