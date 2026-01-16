# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2025-01-15

### Security
- **Critical**: Updated Next.js from 14.2.20 to 14.2.35 (fixes 9 CVEs including DoS, SSRF, cache poisoning)
- **Moderate**: Updated Electron from 33.4.0 to 35.2.1 (fixes ASAR integrity bypass)
- **Moderate**: Updated eslint-config-next to 14.2.35

### Changed
- All debug logging (console.log/console.error) now gated behind development mode
- Added `devLog()` and `devError()` helpers for consistent development-only logging
- Updated copyright year to 2025 in electron-builder configuration
- Fixed LICENSE file reference in NSIS installer configuration

### Fixed
- Production builds no longer emit debug logs to console
- Electron preload script logging only active in development mode
- RAG helper logging properly gated for production

## [1.1.0] - 2025-01-14

### Added
- **HNS Error Detection & Recovery System**
  - `lib/hns-error-detector.ts` - Automatic detection of HNS-specific errors
  - `components/HNSErrorRecovery.tsx` - Recovery UI with guided actions
  - `components/NetworkDiagnostics.tsx` - Proactive network health checking
- **New PowerShell Scripts**
  - `Deploy-BC-Container.ps1` - Direct Docker deployment (bypasses BcContainerHelper HNS issues)
  - `Fix-HNS-State.ps1` - Aggressive HNS cleanup script
  - `Diagnose-HNS-Ports.ps1` - Non-destructive network diagnostics
- Docker Setup page (`app/setup/`) - Prerequisites checker
- Container details page (`app/container/`)

### Changed
- Create Container page now uses `Deploy-BC-Container.ps1` by default (more reliable on Windows 11 24H2)
- Deployment wizard shows "Network Diagnostics" button for proactive troubleshooting
- Enhanced backup/restore scripts with better error handling

### Fixed
- HNS port conflict errors (0x803b0013) now auto-detected with recovery options
- Container deployment reliability on Windows 11 24H2

### Screenshots
- Updated all 7 application screenshots to reflect current UI

## [1.0.1] - 2025-01-01

### Added
- Comprehensive troubleshooting section (243 lines, 8 categories)
  - Application won't start
  - Docker connection issues
  - AI troubleshooting not working
  - PowerShell script failures
  - Backup/restore issues
  - Build errors
  - Container management errors
  - Logs and debugging

### Changed
- Enhanced README documentation structure

## [1.0.0] - 2024-12-30

### Added
- Initial release of BC Docker Manager
- Electron + TypeScript desktop application
- Claude AI-powered troubleshooting integration
- One-click container deployment
- PowerShell script integration (Install-BC-Helper.ps1)
- Container lifecycle management (create, start, stop, remove)
- Backup and restore functionality
- Real-time container logs viewer
- Settings management
- Installation guide and documentation
- Related projects cross-linking
- MIT License

### Features
- Docker container management for Business Central
- AI chat for troubleshooting
- Sidebar navigation
- Container status monitoring
- Deployment modal with configuration options

[Unreleased]: https://github.com/azullus/bc-docker-manager/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/azullus/bc-docker-manager/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/azullus/bc-docker-manager/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/azullus/bc-docker-manager/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/azullus/bc-docker-manager/releases/tag/v1.0.0
