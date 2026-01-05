# Code Review

Review the current changes or a specific file for quality, security, and best practices.

## Pre-computed Context

```bash
git diff --name-only HEAD~1
git log --oneline -1
```

## Review Checklist

1. **Security**: Check for vulnerabilities (injection, XSS, credentials, etc.)
2. **Logic**: Verify correctness and edge case handling
3. **Performance**: Identify potential bottlenecks
4. **Maintainability**: Assess code clarity and documentation
5. **Testing**: Verify test coverage for changes
6. **Standards**: Check adherence to project coding conventions

## Output Format

Provide a structured review with:
- **Summary**: One-line overview
- **Issues**: Any problems found (Critical/Warning/Info)
- **Suggestions**: Improvements to consider
- **Approval**: Ready to merge? Yes/No/Needs changes
