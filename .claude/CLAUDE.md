# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## BC Docker Manager

BC Docker Manager is a **desktop application** (Electron + Next.js) for managing Business Central Docker containers. It provides a native Windows app for container management, log viewing, backup operations, AI-powered troubleshooting, and **one-click container deployment** via Install-BC-Helper.ps1.

## Architecture

### Desktop App (Electron)
- **Main Process** - `electron/main.js` - Window management, IPC, PowerShell execution
- **Preload Script** - `electron/preload.js` - Secure bridge between main and renderer
- **IPC Handlers** - `electron/ipc-handlers.js` - Docker/backup/AI operations

### Frontend (React/Next.js)
- **App Router** - Uses Next.js 14 app directory structure
- **Client Components** - Interactive pages marked with 'use client'
- **Tailwind CSS** - Utility-first styling with custom theme
- **API Abstraction** - `lib/electron-api.ts` - Works in both web and Electron

### Key Files

| File | Purpose |
|------|---------|
| `electron/main.js` | Electron main process entry point |
| `electron/preload.js` | Secure IPC bridge |
| `electron/ipc-handlers.js` | All backend operations (Docker, backups, AI) |
| `lib/electron-api.ts` | Unified API for web/Electron |
| `lib/docker-api.ts` | Docker Engine API wrapper (web mode) |
| `lib/types.ts` | TypeScript interfaces |
| `app/create/page.tsx` | Container creation wizard |
| `app/settings/page.tsx` | App configuration |

## Development Commands

```bash
# Web development (Next.js only)
npm run dev           # Start dev server (port 3000)

# Electron development
npm run electron:dev  # Start Next.js + Electron together

# Building
npm run build         # Build Next.js static export
npm run electron:build:win     # Build Windows installer
npm run electron:build:portable # Build portable .exe

# Testing
npm run test          # Run Jest tests
npm run lint          # Run ESLint
```

## Testing

```bash
npm test              # Run Jest test suite
npm run test:coverage # With coverage report
```

Test files in `__tests__/` directory using React Testing Library.

## Container Naming Convention

The app filters for containers matching `bcserver-*` pattern:

```typescript
const BC_CONTAINER_PATTERN = /^bcserver/;
```

## API Design

### Electron Mode (Desktop App)
Uses IPC via `window.electronAPI`:
```typescript
import { listContainers } from '@/lib/electron-api';
const containers = await listContainers();
```

### Web Mode (Fallback)
Uses Next.js API routes via fetch:
```typescript
const response = await fetch('/api/containers');
```

### Response Pattern
```typescript
{ success: true, data: [...] }
{ success: false, error: "Error message" }
```

## PowerShell Integration

The desktop app can execute PowerShell scripts:

```typescript
import { runPowerShell, onPowerShellOutput } from '@/lib/electron-api';

// Subscribe to real-time output
const unsubscribe = onPowerShellOutput((data) => {
  console.log(data.type, data.data);
});

// Execute script
const result = await runPowerShell('scripts/Install-BC-Helper.ps1', [
  '-Version', 'Latest',
  '-ContainerName', 'bcserver-test'
]);
```

## Settings Storage

Desktop app settings are stored in:
- Windows: `%APPDATA%/bc-container-manager/settings.json`

Available settings:
- `anthropicApiKey` - Claude API key for troubleshooting
- `backupRoot` - Backup directory path
- `autoRefreshInterval` - Dashboard refresh rate

## Building for Distribution

1. **Add app icons** to `assets/`:
   - `icon.ico` (Windows)
   - `icon.png` (512x512)
   - `icon.icns` (macOS, optional)

2. **Build the app**:
   ```bash
   npm run electron:build:win
   ```

3. **Output**:
   - Installer: `dist/BC Container Manager-Setup-1.0.0.exe`
   - Portable: `dist/BC Container Manager-Portable-1.0.0.exe`

## Project Structure

```
BC-Docker-Manager/
├── electron/
│   ├── main.js           # Main process
│   ├── preload.js        # Preload script
│   └── ipc-handlers.js   # IPC handlers
├── app/
│   ├── create/           # Container creation wizard
│   ├── settings/         # App settings
│   ├── dashboard/        # Container list
│   ├── backups/          # Backup management
│   └── troubleshoot/     # AI chat
├── lib/
│   ├── electron-api.ts   # Unified API layer
│   ├── docker-api.ts     # Docker operations (web)
│   └── types.ts          # TypeScript types
├── scripts/
│   ├── Install-BC-Helper.ps1   # Primary deployment script (uses BcContainerHelper)
│   ├── Deploy-BC-Container.ps1 # Alternative deployment (direct Docker, bypasses HNS issues)
│   ├── Fix-HNS-State.ps1       # HNS cleanup script
│   ├── Diagnose-HNS-Ports.ps1  # Network diagnostics
│   ├── Backup-BC-Container.ps1 # Backup operations
│   └── Restore-BC-Container.ps1 # Restore operations
├── assets/               # App icons
├── electron-builder.yml  # Build configuration
└── package.json
```

## Deployment Scripts

The app bundles two deployment approaches:

### Deploy-BC-Container.ps1 (Primary - Used by App)
- Uses direct Docker commands (bypasses BcContainerHelper entirely)
- **Works reliably on Windows 11 24H2** where BcContainerHelper fails with HNS errors
- Simpler password handling via `passwordFile` environment variable
- 20-minute health check timeout for first-time deployments
- **Used by the app's Create Container wizard**

### Install-BC-Helper.ps1 (Standalone/Manual Use)
- Uses BcContainerHelper PowerShell module with `New-BcContainer` cmdlet
- Built-in HNS cleanup and retry logic
- **Fails on Windows 11 24H2** with persistent HNS 0x803b0013 port conflict errors
- Kept for standalone use when BcContainerHelper works (older Windows versions)
- Not used by the app due to HNS issues

## Related Projects

- **PowerShell Scripts** - `Script DB/Windows_Scripts/Docker Dev/`
  - `Install-BC-Helper.ps1` - Main deployment script (bundled in app)
  - `Backup-BC-Container.ps1` - Backup operations
  - `Get-BC-ContainerStatus.ps1` - Diagnostics
  - `DockerHelpers.psm1` - PowerShell module for Docker operations
- **AI-Projects/OFFLINE-AI-CHATBOT/** - RAG engine for offline AI fallback in troubleshooting

## HNS Error Detection & Recovery

The app includes comprehensive error detection and recovery for HNS (Host Network Service) issues:

### Error Detection (`lib/hns-error-detector.ts`)
Automatically detects HNS-specific errors from PowerShell output:
- **Port Conflicts** - `0x803b0013` errors from orphaned NAT mappings
- **HNS Endpoint Errors** - Failed endpoint creation
- **NAT Mapping Conflicts** - Duplicate static mappings
- **Service Failures** - Docker/HNS service issues

### Recovery Components

#### HNSErrorRecovery (`components/HNSErrorRecovery.tsx`)
Displays when deployment fails with HNS error:
- Shows error type, message, and affected ports
- Provides automated recovery actions (run diagnostics, clean state, retry)
- Displays action output with collapsible details
- Educational tooltips explaining HNS concepts

#### NetworkDiagnostics (`components/NetworkDiagnostics.tsx`)
Proactive network health checking:
- Scans for orphaned HNS endpoints
- Lists NAT static mappings in BC port range (8000-9999)
- Checks Windows excluded port ranges
- Displays service status (Docker, HNS)
- Color-coded issue severity (error/warning/info)

### Diagnostic Scripts

Two PowerShell scripts bundled with the app (in `scripts/`):

#### Fix-HNS-State.ps1
Aggressive HNS cleanup (requires admin):
1. Stops Docker and HNS services
2. Removes ALL orphaned HNS endpoints
3. Clears NAT static mappings in BC port range
4. Restarts services with clean state
5. Verifies cleanup success

**Usage in app**: Automated via "Clean HNS State" button

#### Diagnose-HNS-Ports.ps1
Non-destructive diagnostics (requires admin):
- Lists HNS endpoints (identifies orphaned ones)
- Shows NAT static mappings on BC ports
- Checks Windows excluded port ranges
- Reports active TCP listeners on BC ports
- Provides recommendations

**Usage in app**: "Scan Network" button in diagnostics panel

### Deployment Workflow with Error Handling

1. User clicks "Deploy Container"
2. PowerShell output monitored in real-time
3. On error: `detectHNSError()` analyzes output
4. If HNS error detected: Shows `HNSErrorRecovery` component
5. User clicks "Run Diagnostics" → Executes `Diagnose-HNS-Ports.ps1`
6. User clicks "Clean HNS State" → Executes `Fix-HNS-State.ps1 -Force`
7. User clicks "Retry Deployment" → Re-runs deployment

### Error Patterns

Common HNS errors detected:
```
port already exists (0x803b0013)         → Port Conflict
failed to create endpoint on network     → HNS Endpoint Error
nat mapping already exists               → NAT Mapping Conflict
host network service not running         → Service Failure
```

## Troubleshooting

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

### Docker Connection Issues
- Ensure Docker Desktop is running
- Check Docker socket permissions
- App connects to `//./pipe/docker_engine` on Windows

### Electron Build Fails
- Ensure all dependencies installed: `npm install`
- Run `npm run build` before Electron build
- Check `assets/` has required icon files

### PowerShell Scripts Not Running
- Scripts must be in `scripts/` directory
- Execution policy must allow running scripts
- **Run as administrator** (required for HNS cmdlets)

### Settings Not Saving
- Check write permissions to `%APPDATA%`
- Settings stored in `bc-container-manager/settings.json`

## Build Status

| Component | Status | Notes |
|-----------|--------|-------|
| Next.js Build | Passing | `.next/` (45 MB) |
| Electron Build | Passing | `dist/BC Container Manager-Setup-1.0.0.exe` (147 MB) |
| Jest Tests | Passing | Run with `npm test` |

### Known Issues
- RAG fallback integrated via OFFLINE-AI-CHATBOT

## Multi-Agent Worktree Protocol

This project supports parallel development using Git worktrees. When multiple Claude agents work simultaneously:

### Worktree Structure
```
AI-Projects/
├── BC-Docker-Manager/              ← Main worktree (main branch)
└── BC-Docker-Manager-worktrees/    ← Feature worktrees
    ├── feature-ui/                 ← Agent 1 workspace
    ├── feature-api/                ← Agent 2 workspace
    └── bugfix-docker/              ← Agent 3 workspace
```

### Agent Rules
1. **Check assignment** - Confirm which worktree/branch you're assigned to
2. **Stay in your lane** - Only modify files in YOUR worktree
3. **Branch naming** - Use `feature/`, `bugfix/`, or `refactor/` prefixes
4. **Commit frequently** - Small, atomic commits with clear messages
5. **Push before ending** - Always push to remote before session ends
6. **Never touch main** - Only merge via PR after review

### Setup Commands
```bash
# Create worktrees directory
mkdir -p ../BC-Docker-Manager-worktrees

# Create feature worktrees
git worktree add ../BC-Docker-Manager-worktrees/feature-ui -b feature/ui-improvements
git worktree add ../BC-Docker-Manager-worktrees/feature-api -b feature/api-updates
git worktree add ../BC-Docker-Manager-worktrees/bugfix-docker -b bugfix/docker-connection

# List active worktrees
git worktree list

# Remove worktree when done
git worktree remove ../BC-Docker-Manager-worktrees/feature-ui
```

### Merge Workflow
1. Push feature branch to remote
2. Create PR on GitHub
3. Review and merge to main
4. Delete feature branch and worktree
