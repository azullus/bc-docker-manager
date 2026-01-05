# Lint Code

Run linters and formatters for the current project.

## Auto-detect and Run

### Node.js / TypeScript
```bash
npm run lint
# or
npx eslint . --fix
npx prettier --write .
```

### PowerShell
```bash
pwsh -c "Invoke-ScriptAnalyzer -Path . -Recurse -Settings ./tests/PSScriptAnalyzerSettings.psd1"
```

### .NET / C#
```bash
dotnet format
```

## Instructions

1. Detect project type
2. Run appropriate linter with auto-fix enabled
3. Report any remaining issues
4. Stage fixed files if requested
