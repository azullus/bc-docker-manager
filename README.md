# BC Container Manager

> Native Windows desktop application for managing Business Central Docker containers with AI-powered troubleshooting and one-click deployment.

[![Release](https://img.shields.io/github/v/release/azullus/bc-docker-manager?logo=github)](https://github.com/azullus/bc-docker-manager/releases)
[![Electron](https://img.shields.io/badge/Electron-Latest-47848F?logo=electron)](https://www.electronjs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/github/license/azullus/bc-docker-manager)](LICENSE.txt)
[![Stars](https://img.shields.io/github/stars/azullus/bc-docker-manager?style=flat)](https://github.com/azullus/bc-docker-manager/stargazers)
[![Issues](https://img.shields.io/github/issues/azullus/bc-docker-manager)](https://github.com/azullus/bc-docker-manager/issues)
[![Last Commit](https://img.shields.io/github/last-commit/azullus/bc-docker-manager)](https://github.com/azullus/bc-docker-manager/commits/main)

**Desktop app for:**
- 🐳 Business Central container lifecycle management
- 📊 Real-time log viewing and diagnostics
- 💾 Automated backup operations
- 🤖 AI-powered troubleshooting (Claude API)
- ⚡ One-click deployment via Install-BC-Helper.ps1

---

## 🚀 Quick Start

### Prerequisites

| Component | Requirement |
|-----------|-------------|
| **OS** | Windows 10/11 |
| **Docker** | Docker Desktop for Windows |
| **Node.js** | 18+ (for development) |
| **PowerShell** | 7.0+ (bundled scripts) |
| **Optional** | Anthropic API key (AI features) |

### Download & Install

**Option 1: Run Installer** (Recommended)
```bash
# Download from GitHub Releases
# Run: BC Container Manager-Setup-1.0.0.exe
# Follow installation wizard
```

**Option 2: Portable Executable**
```bash
# Download: BC Container Manager-Portable-1.0.0.exe
# Run directly without installation
```

### Development Setup

```bash
# Clone repository
git clone https://github.com/azullus/bc-docker-manager.git
cd bc-docker-manager

# Install dependencies
npm install

# Run Electron app in development mode
npm run electron:dev

# Or run as web app only
npm run dev
```

---

## 🏗️ Architecture

### Electron Desktop App

```
┌─────────────────────────────────────────┐
│         Electron Main Process           │
│  ┌─────────────────────────────────┐   │
│  │   electron/main.js              │   │
│  │   - Window management           │   │
│  │   - IPC handlers                │   │
│  │   - PowerShell execution        │   │
│  └─────────────────────────────────┘   │
│              ↕ IPC                      │
│  ┌─────────────────────────────────┐   │
│  │   Renderer Process (Next.js)    │   │
│  │   - React components            │   │
│  │   - UI/UX                        │   │
│  │   - Client-side logic           │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
         ↕                    ↕
   Docker API          PowerShell Scripts
```

**Key Files:**
- `electron/main.js` - Electron entry point, window creation
- `electron/preload.js` - Secure IPC bridge
- `electron/ipc-handlers.js` - Backend operations (Docker, backups, AI)
- `lib/electron-api.ts` - Unified API for renderer process

### Dual-Mode Support

The app works in two modes:

1. **Electron Mode** (Desktop) - Uses IPC for Docker/PowerShell operations
2. **Web Mode** (Fallback) - Uses Next.js API routes via fetch

---

## ✨ Features

### Container Management

- **Dashboard View** - All BC containers at a glance
- **Status Monitoring** - Real-time container state
- **Quick Actions** - Start, stop, restart, remove with one click
- **Port Mappings** - View exposed ports and services
- **Resource Stats** - CPU, memory, network usage

### Log Viewer

- **Real-time Streaming** - Live container logs
- **Search & Filter** - Find specific log entries
- **Export** - Save logs to file for analysis
- **Color-coded** - Error/warning/info highlighting

### Backup Management

- **Automated Backups** - Schedule container backups
- **Backup Browser** - View all existing backups
- **Restore Operations** - Restore from backup
- **Retention Policy** - Auto-delete old backups
- **Size Tracking** - Monitor backup disk usage

### AI Troubleshooting

Powered by Claude API:
- Diagnose container startup failures
- Suggest fixes for common BC issues
- License troubleshooting assistance
- Extension deployment guidance
- Performance optimization tips

**Context-aware**: AI has knowledge of Business Central Docker architecture and common issues.

### One-Click Deployment

Integrated PowerShell deployment:
```powershell
# Bundled script: scripts/Install-BC-Helper.ps1
# Deploys BC containers with:
- Automatic version selection
- License import
- Port configuration
- Database initialization
```

---

## 📂 Project Structure

```
bc-docker-manager/
├── electron/
│   ├── main.js              # Electron main process
│   ├── preload.js           # IPC bridge (secure)
│   ├── ipc-handlers.js      # Backend operations
│   └── rag-helper.js        # RAG integration for offline AI
│
├── app/                     # Next.js App Router
│   ├── dashboard/page.tsx   # Container list view
│   ├── create/page.tsx      # Container creation wizard
│   ├── backups/page.tsx     # Backup management
│   ├── troubleshoot/page.tsx # AI chat interface
│   ├── settings/page.tsx    # App configuration
│   └── layout.tsx           # Main layout with sidebar
│
├── components/
│   ├── ContainerCard.tsx    # Container display component
│   ├── LogViewer.tsx        # Real-time log viewer
│   ├── AIChat.tsx           # AI chat interface
│   ├── DeploymentModal.tsx  # Container creation dialog
│   ├── Sidebar.tsx          # Navigation menu
│   └── Providers.tsx        # React context providers
│
├── lib/
│   ├── electron-api.ts      # Unified API layer
│   ├── docker-api.ts        # Docker Engine API (web mode)
│   ├── ai-client.ts         # Claude API integration
│   ├── types.ts             # TypeScript interfaces
│   └── deployment-context.tsx # Deployment state management
│
├── scripts/
│   └── Install-BC-Helper.ps1 # Bundled deployment script
│
├── electron-builder.yml     # Electron build configuration
├── package.json             # Dependencies and scripts
└── README.md                # This file
```

---

## 🔧 Configuration

### Application Settings

Settings stored in: `%APPDATA%/bc-container-manager/settings.json`

```json
{
  "anthropicApiKey": "sk-ant-...",
  "backupRoot": "C:\\BCBackups",
  "autoRefreshInterval": 5000,
  "defaultContainerPrefix": "bcserver"
}
```

### Environment Variables (Development)

Create `.env.local` for development:

```env
# Anthropic API key (optional, for AI features)
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Backup directory
BACKUP_ROOT=C:\BCBackups

# Docker socket (default for Windows)
DOCKER_HOST=//./pipe/docker_engine
```

---

## 🎯 Usage

### Creating a Container

1. Click **"New Container"** button
2. Select BC version (Latest, LTS, Specific)
3. Configure:
   - Container name
   - License file (optional)
   - Ports (Web Client, SOAP, OData, DEV)
   - Authentication mode
4. Click **"Deploy"** to run Install-BC-Helper.ps1
5. Monitor deployment progress in real-time

### Managing Containers

**Start/Stop:**
- Click power icon on container card
- Or use bulk actions from dashboard

**View Logs:**
- Click container name → Logs tab
- Search for errors or specific text
- Export to file for analysis

**Create Backup:**
- Container Details → Backups
- Click "Create Backup"
- Specify backup name and location

### AI Troubleshooting

1. Navigate to **Troubleshoot** page
2. Describe your issue in chat
3. AI provides context-aware suggestions
4. Follow recommended fixes
5. Run suggested PowerShell commands if needed

**Example queries:**
- "Container won't start after restart"
- "Getting license error on login"
- "Web client shows 404 error"
- "How do I import a BC extension?"

---

## 🛠️ Development

### Available Scripts

```bash
# Development (web only)
npm run dev              # Start Next.js dev server

# Development (Electron)
npm run electron:dev     # Start Electron + Next.js

# Building
npm run build            # Build Next.js static export
npm run electron:build:win      # Build Windows installer
npm run electron:build:portable # Build portable .exe

# Testing
npm test                 # Run Jest tests
npm run test:coverage    # With coverage report
npm run lint             # ESLint validation
```

### Build Output

After running `npm run electron:build:win`:

```
dist/
├── BC Container Manager-Setup-1.0.0.exe    # Installer (147 MB)
├── BC Container Manager-Portable-1.0.0.exe # Portable (145 MB)
└── win-unpacked/                            # Unpacked app files
```

---

## 🐳 Container Naming Convention

The app filters for containers matching: `^bcserver`

**Compatible naming:**
- `bcserver-dev`
- `bcserver-production`
- `bcserver-latest-v23`
- `bcserver-sandbox`

**Create with BcContainerHelper:**
```powershell
New-BcContainer -containerName "bcserver-dev" `
    -artifactUrl (Get-BcArtifactUrl -type Sandbox -version "23.0") `
    -accept_eula
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# Coverage report
npm run test:coverage
```

**Test suites:**
- `__tests__/components/` - React component tests
- `__tests__/lib/` - Utility function tests

---

## 📡 API Reference

### IPC Channels (Electron Mode)

| Channel | Description | Parameters |
|---------|-------------|------------|
| `docker:list` | List containers | - |
| `docker:start` | Start container | `containerId` |
| `docker:stop` | Stop container | `containerId` |
| `docker:logs` | Get logs | `containerId, tail` |
| `powershell:run` | Execute script | `scriptPath, args` |
| `backup:create` | Create backup | `containerId, path` |
| `ai:chat` | Send AI message | `message, history` |

### REST Endpoints (Web Mode)

Fallback API routes for non-Electron usage:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/containers` | GET | List all containers |
| `/api/containers` | POST | Container action |
| `/api/logs` | GET | Container logs |
| `/api/backups` | GET | List backups |
| `/api/backups` | POST | Create backup |
| `/api/ai` | POST | AI chat |

---

## 🔒 Security

- **IPC Isolation**: Context isolation enabled in Electron
- **No eval()**: Secure script execution via spawn
- **API Keys**: Stored encrypted in %APPDATA%
- **Docker Socket**: Local access only (no remote exposure)

---

## 📦 Technologies

| Layer | Technology |
|-------|-----------|
| **Desktop** | Electron Latest |
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 3 |
| **Docker API** | Native IPC to PowerShell/Docker |
| **AI** | Anthropic Claude API |
| **Build** | electron-builder |
| **Testing** | Jest + React Testing Library |

---

## 🔗 Related Projects

- **[cosmicbytez-ops-toolkit](https://github.com/azullus/cosmicbytez-ops-toolkit)** - PowerShell scripts including Install-BC-Helper.ps1
- **[docker-infrastructure](https://github.com/azullus/docker-infrastructure)** - Self-hosted infrastructure stacks

---

## 📝 License

MIT License - See [LICENSE.txt](LICENSE.txt) for details.

---

**Built with ❤️ for Business Central DevOps | Windows Desktop | Docker Orchestration**
