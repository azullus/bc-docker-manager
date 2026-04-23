# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.3.0] - 2026-04-23

### Added
- **BC 28 support** (2026 Wave 1) — newest Business Central version is now selectable in the Create Container wizard and the `Install-BC-Helper.ps1` version menu.
- `/api/docker/info` web-mode stub route — sidebar health probe now returns a 501 with a documented error message instead of 404ing on every navigation.
- `BC_HOWTO_PATH` environment variable override for the offline RAG helper in dev mode.
- Claude Code PR-review GitHub Action for automated code review on pull requests.
- Dependabot configuration for automated dependency update PRs.
- Auto-fix GitHub Actions workflow for lint corrections.
- Stack, Environment Variables, and pre-commit-checklist sections in CLAUDE.md.

### Fixed
- **Setup page fake-green bug** — BcContainerHelper / Hyper-V / WSL tiles were flipping from "Checking..." to "Installed" / "Enabled" after 1.5s regardless of whether anything was probed. They now honestly report "Unknown" until a real probe is added.
- **Backups restore path handling** — now uses the validated resolved path (aligned with `backups:delete`) instead of the raw caller input, closing a TOCTOU-ish inconsistency.
- **RAG helper dev-mode path** — was pointing at a location that didn't exist in either the Windows or Linux workspace layout; now probes both known sibling AZU-VAULT layouts and supports `BC_HOWTO_PATH` override.
- **Sidebar test React `act()` warnings** — tests now wait for the Docker-status effect to settle before returning, eliminating the console noise that masked real warnings.
- **BC release-wave labels** — BC 21 through BC 27 were all shifted by one wave (e.g., BC 27 showed "2025 W1" but Microsoft released it as 2025 W2). Corrected across the UI dropdown and PowerShell menu.
- Next.js version note in CLAUDE.md (14 → 16).

### Changed
- **Next.js 14 → 16** (App Router features upgraded; same routing structure).
- **Electron 35 → 41** (security + feature improvements).
- **Jest 29 → 30** (no config changes required; all 257 tests pass unchanged).
- **Claude model** upgraded to `claude-sonnet-4-6` for AI troubleshooting.
- HNS troubleshooting documentation moved from the repo root into `docs/hns-troubleshooting.md`.
- CLAUDE.md now lives at the project root (Claude Code auto-discovery).
- GitHub Actions workflows standardized and switched to the CosmicBytez self-hosted runner where appropriate.
- CLAUDE.md `BC_CONTAINER_PATTERN` docs corrected to match the actual `/bc/i` regex, with an explanation of why the permissiveness is intentional.

### Removed
- **Dead code** (781 lines): `lib/docker-api.ts`, `lib/ai-client.ts`, and the orphaned test file. Never imported; superseded by the Electron IPC handlers in `electron/ipc-handlers.js`.
- Fake 1.5s `setTimeout` in the setup page that flipped tile statuses to green without probing.

### Security
- **Critical**: `protobufjs` 7.5.4 → 7.5.5 ([GHSA-xq3m-2v4x-88gg](https://github.com/advisories/GHSA-xq3m-2v4x-88gg) — arbitrary code execution; pulled transitively by `dockerode`).
- **High**: Next.js patched for DoS advisory [GHSA-q4gf-8mx6-v5v3](https://github.com/advisories/GHSA-q4gf-8mx6-v5v3).
- **High**: `@xmldom/xmldom` 0.8.11 → 0.8.13 (XML injection via unsafe CDATA serialization; dev dep via electron-builder).
- **High**: `lodash` 4.17.23 → 4.18.1 (code injection + prototype pollution; dev dep).
- **Moderate**: `axios` 1.13.5 → 1.15.2 (NO_PROXY SSRF bypass + cloud-metadata exfiltration via header injection).
- **Moderate**: `follow-redirects` → 1.16.0 (auth header leak on cross-domain redirects).
- **Low (dev-only)**: `jest-environment-jsdom` 29 → 30 clears the remaining `jsdom` / `http-proxy-agent` / `@tootallnate/once` chain.
- Additional transitive patches: `flatted`, `picomatch`, `tar`, `brace-expansion`.

### Known advisories (tracked, not exploitable in this application)
- `uuid <14.0.0` ([GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq), moderate, CVSS 0) — missing buffer bounds check in `v3`/`v5`/`v6` when a pre-allocated buffer is provided. Reaches us via `dockerode` (which declares `uuid ^10.0.0`). Not reachable in this app — `dockerode` generates IDs via `v4()` without a `buf` argument. Will clear automatically once `dockerode` relaxes its `uuid` range upstream.

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
