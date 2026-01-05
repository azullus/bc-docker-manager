# PostToolUse Hook Configuration

Configure hooks to run after Claude makes edits.

## Recommended Hooks

Add these to your `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "npx prettier --write $CLAUDE_FILE_PATH",
            "condition": "endsWith($CLAUDE_FILE_PATH, '.ts') || endsWith($CLAUDE_FILE_PATH, '.tsx') || endsWith($CLAUDE_FILE_PATH, '.js')"
          },
          {
            "type": "command",
            "command": "npx eslint --fix $CLAUDE_FILE_PATH",
            "condition": "endsWith($CLAUDE_FILE_PATH, '.ts') || endsWith($CLAUDE_FILE_PATH, '.tsx')"
          }
        ]
      }
    ],
    "PreCommit": [
      {
        "type": "command",
        "command": "npm run lint && npm test"
      }
    ]
  }
}
```

## PowerShell Projects

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "pwsh -c \"Invoke-ScriptAnalyzer -Path '$CLAUDE_FILE_PATH' -Fix\"",
            "condition": "endsWith($CLAUDE_FILE_PATH, '.ps1')"
          }
        ]
      }
    ]
  }
}
```

## Notes

- Hooks run automatically after Claude edits files
- They ensure consistent formatting without manual intervention
- Configure based on your project's linting/formatting tools
