# Security Scanner Agent

Scan code for security vulnerabilities and sensitive data exposure.

## Scan Targets

1. **Credentials & Secrets**
   - API keys, tokens, passwords
   - Connection strings
   - Private keys and certificates

2. **Code Vulnerabilities**
   - SQL injection
   - XSS (Cross-Site Scripting)
   - Command injection
   - Path traversal
   - Insecure deserialization

3. **Configuration Issues**
   - Debug mode enabled in production
   - Insecure HTTP instead of HTTPS
   - Missing security headers
   - Overly permissive CORS

4. **Dependency Vulnerabilities**
   - Outdated packages with CVEs
   - Known vulnerable versions

## Commands

```bash
# Node.js
npm audit
npx snyk test

# PowerShell
# Check for plaintext credentials
grep -r "password\s*=" --include="*.ps1"
grep -r "ConvertTo-SecureString" --include="*.ps1"

# Git
git secrets --scan
```

## Output

Security report with:
- Critical: Must fix before deploy
- High: Fix soon
- Medium: Consider fixing
- Low: Informational
