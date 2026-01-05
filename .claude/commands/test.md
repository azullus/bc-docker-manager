# Run Tests

Run the appropriate test suite for the current project.

## Auto-detect Project Type

```bash
# Check for test runners
ls package.json 2>/dev/null && echo "Node.js project"
ls *.csproj 2>/dev/null && echo ".NET project"
ls tests/*.ps1 2>/dev/null && echo "PowerShell project"
```

## Test Commands by Project Type

### Node.js / TypeScript
```bash
npm test
# or with coverage
npm run test:coverage
```

### .NET / C#
```bash
dotnet test
```

### PowerShell (Pester)
```bash
pwsh -c "Invoke-Pester ./tests/ -Output Detailed"
# or with coverage
./tests/run-all-tests.ps1 -Coverage
```

## Instructions

1. Detect the project type from the directory structure
2. Run the appropriate test command
3. Report results with pass/fail counts
4. If tests fail, analyze the failures and suggest fixes
