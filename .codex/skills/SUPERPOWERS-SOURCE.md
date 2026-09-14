# Superpowers skills provenance

- Source: <https://github.com/obra/superpowers>
- Pinned commit: `b36e0829c6d0140e93cfef2ca599b1b07d4a7797`
- License: MIT; see `SUPERPOWERS-LICENSE.txt`
- Installed directories: `brainstorming`, `writing-plans`, `using-git-worktrees`,
  `executing-plans`, `subagent-driven-development`, `test-driven-development`,
  `requesting-code-review`, `verification-before-completion`

## Permission review

The skills read and write repository files and run local development commands.
The optional brainstorming visual companion also starts a loopback HTTP/WebSocket
server, reads its own `BRAINSTORM_*` configuration from the environment, and can
open a browser only after opt-in. It must not bind to a non-loopback interface or
use `BRAINSTORM_OPEN_CMD` without explicit user approval.

## Static inspection

`npm run workflow:inspect-skill -- <directory>` was run for every installed
directory on 2026-09-14.

- Six directories produced no findings.
- `brainstorming/scripts/server.cjs` was flagged for environment access. Review
  found reads limited to its documented configuration and telemetry-disable
  variables; it does not enumerate or transmit unrelated secrets.
- `brainstorming/scripts/stop-server.sh` was flagged for `rm -rf`. Review found
  deletion guarded to a resolved session directory below `/tmp/`.
- `subagent-driven-development/SKILL.md` was flagged for `secret` and `rm -rf`.
  The former is ordinary prose; the latter instructs deletion of the plan's own
  temporary workspace after review and explicitly preserves sibling directories.

These findings are accepted for use as candidate workflow inputs. They do not
constitute adapter certification.
