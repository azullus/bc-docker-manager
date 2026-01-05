# Commit, Push, and Create PR

Automate the git workflow for committing changes and creating a pull request.

## Pre-computed Context

```bash
# Current branch and status
git branch --show-current
git status --short
git diff --stat HEAD
git log --oneline -3
```

## Instructions

1. Review the staged and unstaged changes above
2. If there are unstaged changes, stage the relevant ones
3. Create a commit with a clear, conventional commit message:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation
   - `chore:` for maintenance
   - `refactor:` for code refactoring
   - `test:` for test changes
4. Push to the remote branch (create if needed with `-u`)
5. If on a feature branch, create a PR to main using `gh pr create`
6. Return the PR URL

## Commit Message Format

```
<type>: <description>

<optional body>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```
