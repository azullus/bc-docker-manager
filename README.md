# BC Docker Manager

A Next.js web application for managing Business Central Docker containers with AI-powered troubleshooting assistance.

## Features

- **Container Dashboard** - View and manage all BC Docker containers
- **Container Controls** - Start, stop, restart containers with one click
- **Real-time Logs** - View container logs with search and filtering
- **Backup Management** - Create and manage database backups
- **AI Troubleshooting** - Get help diagnosing issues with Claude AI

## Requirements

- Node.js 18+
- Docker Desktop or Docker Engine running
- BC containers following the `bcserver-*` naming convention
- (Optional) Anthropic API key for AI troubleshooting

## Installation

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your settings

# Run development server
npm run dev
```

## Configuration

Create a `.env.local` file with the following variables:

```env
# Docker socket path (default for Windows Docker Desktop)
DOCKER_HOST=/var/run/docker.sock

# Anthropic API key for AI troubleshooting (optional)
ANTHROPIC_API_KEY=your-api-key-here

# Backup directory
BACKUP_ROOT=C:\BCBackups
```

## Project Structure

```
BC-Docker-Manager/
├── app/
│   ├── api/
│   │   ├── containers/route.ts    # Container list & actions
│   │   ├── logs/route.ts          # Container log streaming
│   │   ├── backups/route.ts       # Backup management
│   │   └── ai/route.ts            # AI chat endpoint
│   ├── dashboard/page.tsx         # Main container dashboard
│   ├── containers/[id]/page.tsx   # Container detail view
│   ├── backups/page.tsx           # Backup management page
│   ├── troubleshoot/page.tsx      # AI troubleshooting chat
│   ├── layout.tsx                 # App layout with sidebar
│   └── globals.css                # Global styles
├── components/
│   ├── Sidebar.tsx                # Navigation sidebar
│   ├── ContainerCard.tsx          # Container display card
│   ├── LogViewer.tsx              # Log viewer with filtering
│   └── AIChat.tsx                 # AI chat interface
├── lib/
│   ├── docker-api.ts              # Docker Engine API client
│   ├── ai-client.ts               # Claude API integration
│   └── types.ts                   # TypeScript definitions
└── README.md
```

## Usage

### Dashboard

The dashboard displays all BC Docker containers with:
- Container status (running, stopped, etc.)
- Quick actions (start, stop, restart)
- Resource usage statistics
- Links to container details

### Container Details

Click on a container to view:
- Full container information
- Port mappings
- Resource usage (CPU, memory)
- Real-time log viewer
- Backup creation

### Backup Management

The backups page allows you to:
- View all existing backups
- Create new backups from running containers
- Delete old backups
- See backup sizes and dates

### AI Troubleshooting

Get help with common BC Docker issues:
- Container startup failures
- Performance problems
- License issues
- Extension deployment errors

The AI assistant has context about Business Central Docker operations and can provide targeted assistance.

## Container Naming Convention

This application looks for Docker containers matching the pattern `bcserver-*`. Containers should be created using:

- [BcContainerHelper](https://github.com/microsoft/navcontainerhelper) PowerShell module
- The companion `Install-BC-Helper.ps1` or `Install-BC-Latest.ps1` scripts

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/containers` | GET | List all BC containers |
| `/api/containers` | POST | Perform container action (start/stop/restart/remove) |
| `/api/logs` | GET | Get container logs |
| `/api/backups` | GET | List all backups |
| `/api/backups` | POST | Create new backup |
| `/api/backups` | DELETE | Delete a backup |
| `/api/ai` | POST | Send message to AI assistant |

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Docker API**: dockerode
- **AI**: Anthropic Claude API
- **Icons**: Lucide React

## License

MIT
