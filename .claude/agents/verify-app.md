# Application Verifier Agent

Verify that the application works correctly after changes.

## Verification Steps

### 1. Build Verification
- Run the build command for the project
- Ensure no compilation errors
- Check for TypeScript/linting warnings

### 2. Test Suite
- Run all automated tests
- Verify 100% pass rate
- Check code coverage hasn't decreased

### 3. Manual Verification (if applicable)
- Start the development server
- Test the affected feature manually
- Verify no console errors in browser

### 4. Security Check
- Run security audit (npm audit, etc.)
- Check for exposed credentials
- Verify no sensitive data in logs

## Project-Specific Commands

### Node.js/Next.js
```bash
npm run build
npm test
npm run lint
npm audit
```

### PowerShell
```bash
./tests/run-all-tests.ps1
Invoke-ScriptAnalyzer -Path . -Recurse
```

### .NET
```bash
dotnet build
dotnet test
dotnet format --verify-no-changes
```

## Output

Report with:
- Build status: Pass/Fail
- Test results: X/Y passing
- Security issues: None/List
- Ready for commit: Yes/No
