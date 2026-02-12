#!/bin/bash
# Pre-tool-use guard hook for ResearchApp
# Blocks dangerous operations before they execute
# Exit code 2 = block execution

TOOL_INPUT="${CLAUDE_TOOL_INPUT:-}"

# Block force pushes to main/master
if echo "$TOOL_INPUT" | grep -qE 'git\s+push\s+.*--force.*\b(main|master)\b'; then
  echo "BLOCKED: Force push to main/master is not allowed" >&2
  exit 2
fi

if echo "$TOOL_INPUT" | grep -qE 'git\s+push\s+-f\s'; then
  echo "BLOCKED: Force push (-f) detected. Use --force-with-lease if needed." >&2
  exit 2
fi

# Block destructive rm commands on critical paths
if echo "$TOOL_INPUT" | grep -qE 'rm\s+(-rf|-fr)\s+(/|/usr|/etc|/sys|/var|\.\.)'; then
  echo "BLOCKED: Dangerous rm command on system path" >&2
  exit 2
fi

# Block DROP TABLE
if echo "$TOOL_INPUT" | grep -iqE 'DROP\s+TABLE'; then
  echo "BLOCKED: DROP TABLE command detected" >&2
  exit 2
fi

# Block accidental npm publish
if echo "$TOOL_INPUT" | grep -qE 'npm\s+publish'; then
  echo "BLOCKED: npm publish not allowed from hooks" >&2
  exit 2
fi

exit 0
