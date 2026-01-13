# Install-BC-Helper.ps1 Retry Logic Enhancements (v4.9)

## Summary

Enhanced the HNS port conflict retry logic in `Install-BC-Helper.ps1` to provide more robust recovery from persistent "port already exists (0x803b0013)" errors during Business Central container deployment.

## Changes Made

### 1. Enhanced Diagnostic Output
- **Before**: Limited visibility into which ports were causing conflicts
- **After**: Detailed 7-step diagnostic process showing:
  - Which specific ports are stuck (netstat check)
  - Number of zombie containers removed
  - NAT mappings cleaned per port
  - HNS endpoints removed
  - Docker readiness status with wait time
  - Post-restart port verification results

### 2. Aggressive Port Cleanup BEFORE Docker Restart
- **Before**: Cleaned NAT mappings after Docker restart (allowing recreation)
- **After**: Cleans NAT mappings while Docker is stopped (prevents recreation)
- **Impact**: Addresses root cause of persistent 0x803b0013 errors

### 3. Extended Docker Wait Timeout
- **Before**: 12 retries @ 5s = 60s max wait
- **After**: 15 retries @ 5s = 75s max wait
- **Impact**: Gives Docker more time to fully initialize HNS state

### 4. Port Verification Step
- **Before**: No verification that ports were released
- **After**: TCP connection test to each port after cleanup
- **Impact**: Provides early warning if cleanup failed

### 5. Exponential Backoff Between Retries
- **Before**: Fixed 5-second wait between retries
- **After**: Exponential backoff (2^retryCount seconds)
  - Retry 1: 2 seconds
  - Retry 2: 4 seconds
  - Retry 3: 8 seconds
- **Impact**: Gives HNS state more time to stabilize between attempts

### 6. Removed Port Bumping Strategy
- **Before**: Bumped ports by +100 on each retry (avoided root cause)
- **After**: Uses original ports with proper cleanup (fixes root cause)
- **Impact**: Maintains intended port assignments, better integration with Fix-HNS-State.ps1

### 7. Improved Error Messages
- **Before**: Generic retry messages
- **After**:
  - Structured 7-step process with progress indicators
  - Clear success/warning indicators (✓/⚠)
  - Detailed final diagnostics if all retries fail
  - Suggests Fix-HNS-State.ps1 for nuclear cleanup

## Technical Details

### The 7-Step Retry Process

```powershell
# STEP 1: Diagnose which specific ports are stuck
- Uses netstat to identify listening ports
- Extracts all required ports from container params
- Logs each stuck port individually

# STEP 2: Remove zombie containers
- Removes target container (if exists)
- Removes ALL containers in 'created' state
- Prevents orphaned Docker objects

# STEP 3: Aggressive NAT cleanup (BEFORE Docker restart)
- Queries Get-NetNatStaticMapping
- Removes mappings for each stuck port
- Uses -Confirm:$false for non-interactive operation
- Waits 3 seconds for NAT layer to settle

# STEP 4: Clean orphaned HNS endpoints (BEFORE restart)
- Queries Get-HnsEndpoint
- Filters for bcserver* and target container
- Removes each endpoint individually
- Logs count of removed endpoints

# STEP 5: Restart Docker and HNS services
- Stops Docker first (releases HNS handles)
- Restarts HNS (clears port reservations at OS level)
- Starts Docker (creates clean HNS state)
- Extended wait times between steps

# STEP 6: Wait for Docker readiness
- Extended timeout (15 retries @ 5s)
- Tests with 'docker info'
- Shows progress dots during wait
- Logs actual wait time on success

# STEP 7: Verify ports released
- TCP connection test to each port
- Identifies any still-stuck ports
- Provides specific warning for each stuck port
- Helps diagnose Windows excluded port ranges
```

### Exponential Backoff

```powershell
$backoffSeconds = [Math]::Pow(2, $retryCount)
# Retry 1: 2^1 = 2 seconds
# Retry 2: 2^2 = 4 seconds
# Retry 3: 2^3 = 8 seconds
```

### Suggested Next Action on Failure

```
RECOMMENDED ACTION:
  Run the Fix-HNS-State.ps1 script for nuclear cleanup:
  .\scripts\Fix-HNS-State.ps1
```

## Integration with Fix-HNS-State.ps1

The enhanced retry logic works in tandem with the new `Fix-HNS-State.ps1` script:

- **Install-BC-Helper.ps1**: Inline retry logic during deployment (3 attempts)
- **Fix-HNS-State.ps1**: Standalone nuclear cleanup when retry fails

Both scripts now use the same cleanup sequence but Fix-HNS-State.ps1:
- Stops services completely before cleanup
- Removes ALL HNS endpoints (not just bcserver)
- Cleans entire BC port range (8000-9999)
- Provides interactive confirmation
- Better for persistent/corrupted HNS state

## Testing Recommendations

1. **Normal Deployment**: Should succeed on first attempt with clean HNS state
2. **Single Port Conflict**: Should resolve on retry 1 with diagnostic output
3. **Persistent Conflict**: Should attempt all 3 retries with exponential backoff
4. **Total Failure**: Should suggest Fix-HNS-State.ps1 with clear error details

## Version History

- **v4.9** (2026-01-11): Enhanced retry logic (this update)
- **v4.8** (2026-01-09): NAT cleanup before Docker restart
- **v4.7** (2026-01-09): Unconditional HNS/Docker restart
- **v4.6** (2026-01-09): Aggressive NAT cleanup in BC port range

## Files Modified

- `scripts/Install-BC-Helper.ps1` - Main deployment script (lines 690-918)
  - Updated retry logic from 130 lines to 228 lines
  - Version updated: 4.8 → 4.9
  - Removed port bumping logic
  - Added 7-step diagnostic process

## Related Files

- `scripts/Fix-HNS-State.ps1` - Nuclear HNS cleanup (suggested on failure)
- `scripts/Diagnose-HNS-Ports.ps1` - Diagnostic tool for HNS state inspection

## Migration Notes

**Breaking Changes**: None - fully backward compatible

**Behavior Changes**:
- Retry attempts now take longer due to exponential backoff (2-14 seconds total)
- More verbose output during retry (7 progress messages vs 2)
- Uses original ports instead of bumping (may require Fix-HNS-State.ps1 more often)

**Recommended Actions**:
1. Update any automation that parses script output
2. Consider using Fix-HNS-State.ps1 before deployment if issues persist
3. Monitor Windows excluded port ranges (Step 7 diagnostics will show these)
