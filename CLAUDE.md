# CLAUDE.md - BC Docker Manager

## Project Overview

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

## Troubleshooting

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
- Run as administrator if needed

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
