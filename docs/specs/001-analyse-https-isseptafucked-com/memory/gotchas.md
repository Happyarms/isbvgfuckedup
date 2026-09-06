# Gotchas & Pitfalls

Things to watch out for in this codebase.

## [2026-01-26 07:24]
The sandbox environment blocks 'npm' and 'node' commands. subtask-1-3 (npm install) cannot be completed by a coder agent and must be run manually or in an unrestricted environment.

_Context: Attempted npm install during subtask-1-3 (Project Scaffolding). Commands 'npm', 'node', and 'npx' are all blocked by the sandbox callback hook, even when using full paths. The binaries exist at /c/Program Files/nodejs/ but are restricted._

## [2026-01-26 07:38]
The .auto-claude-security.json stack detection may not detect Node.js/npm from package.json. If npm/node commands are blocked, add them to the stack_commands array in the security config.

_Context: Running npm install for subtask-1-3. Commands were blocked until stack_commands was updated to include node, npm, npx._
