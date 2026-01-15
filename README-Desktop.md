# BC Container Manager - Desktop App

A native Windows desktop application for managing Business Central Docker containers. Built with Electron + Next.js.

## Features

- **Dashboard**: View all BC containers with real-time stats (CPU, memory, uptime)
- **Container Management**: Start, stop, restart, remove containers
- **Create Containers**: GUI wizard for deploying new BC containers via Install-BC-Helper.ps1
- **Backups**: Create and manage database backups
- **AI Troubleshooting**: Claude-powered assistant for BC container issues
- **Settings**: Configure API keys, backup paths, and preferences

## Quick Start (Development)

```powershell
# Navigate to project directory
cd "C:\Obsidian\AI-Projects\BC-Docker-Manager"

# Install dependencies
npm install

# Run in development mode
npm run electron:dev
```

This starts both Next.js dev server and Electron, with hot-reload.

## Building for Distribution

### Prerequisites
- Node.js 18+
- npm 9+
- Windows 10/11 (for building Windows installer)

### Build Commands

```powershell
# Build Windows installer (.exe)
npm run electron:build:win

# Build portable version (no install needed)
npm run electron:build:portable

# Build unpacked (for testing)
npm run electron:pack
```

### Output

Built files are in the `dist/` folder:
- `BC Container Manager-Setup-1.0.0.exe` - Windows installer
- `BC Container Manager-Portable-1.0.0.exe` - Portable executable
- `win-unpacked/` - Unpacked app folder

## App Icons

Before building, add your icon files to `assets/`:
- `icon.ico` - Windows icon (256x256)
- `icon.png` - PNG icon (512x512)

To generate icons from the SVG:
1. Open `assets/icon.svg` in a browser
2. Take a screenshot or use an online converter
3. Use https://icoconvert.com to create .ico

## Configuration

### Settings (in-app)
- **Anthropic API Key**: Required for AI troubleshooting
- **Backup Directory**: Where backups are stored (default: `C:\BCBackups`)
- **Refresh Interval**: How often dashboard updates

### Environment Variables
- `ANTHROPIC_API_KEY` - Can also be set via environment (optional)

## Architecture

```
BC-Docker-Manager/
├── electron/
│   ├── main.js           # Main process
│   ├── preload.js        # Secure IPC bridge
│   └── ipc-handlers.js   # Docker/backup/AI operations
├── app/                  # Next.js pages
│   ├── dashboard/        # Container list
│   ├── setup/            # Docker prerequisites
│   ├── create/           # Container wizard
│   ├── backups/          # Backup management
│   ├── troubleshoot/     # AI chat
│   └── settings/         # Configuration
├── components/
│   ├── HNSErrorRecovery.tsx    # HNS error recovery UI
│   └── NetworkDiagnostics.tsx  # Network health panel
├── lib/
│   ├── electron-api.ts   # Unified API (works in web & Electron)
│   └── hns-error-detector.ts   # HNS error pattern detection
├── scripts/
│   ├── Deploy-BC-Container.ps1  # Primary deployment (direct Docker)
│   ├── Install-BC-Helper.ps1    # Legacy deployment (BcContainerHelper)
│   ├── Fix-HNS-State.ps1        # HNS cleanup
│   └── Diagnose-HNS-Ports.ps1   # Network diagnostics
└── assets/               # App icons
```

## How It Works

1. **Electron main process** creates the window and handles IPC
2. **Preload script** exposes `window.electronAPI` to the renderer
3. **React UI** calls `lib/electron-api.ts` which routes to:
   - In Electron: IPC handlers (direct Docker/PowerShell access)
   - In Web: Next.js API routes (for development)

## Troubleshooting

### "Docker not connected"
- Ensure Docker Desktop is running
- Check that Docker is using Windows containers (or WSL2)

### "PowerShell script not found"
- Verify scripts exist in `scripts/` directory
- Check execution policy: `Set-ExecutionPolicy -Scope CurrentUser Bypass`

### HNS Port Conflict (0x803b0013)
This is common on Windows 11 24H2. The app will auto-detect and show recovery options.

**Manual Fix:**
```powershell
# Run as Administrator
.\scripts\Diagnose-HNS-Ports.ps1   # Identify orphaned resources
.\scripts\Fix-HNS-State.ps1 -Force # Clean HNS state
```

### Container Deployment Fails
The app uses `Deploy-BC-Container.ps1` by default which bypasses BcContainerHelper HNS issues.

If deployment still fails:
1. Click "Show Network Diagnostics" in the Create Container page
2. Run diagnostics to identify conflicts
3. Use "Clean HNS State" to clear orphaned resources
4. Retry deployment

### Build fails
- Delete `node_modules` and `package-lock.json`, then `npm install`
- Ensure you have the latest npm: `npm install -g npm@latest`

## License

MIT License - See LICENSE.txt
