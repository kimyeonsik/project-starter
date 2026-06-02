# Prerequisites

## Required

### Node.js 20+

macOS:
```bash
brew install node@20
```

Windows (PowerShell):
```powershell
winget install OpenJS.NodeJS.LTS
```

Other:
- Official: https://nodejs.org/
- Version manager (recommended): https://github.com/nvm-sh/nvm (macOS/Linux), https://github.com/coreybutler/nvm-windows (Windows)

Verify:
```bash
node -v   # should print v20.x or higher
```

### pnpm

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

> The installer auto-provisions pnpm via Corepack (falling back to `npm i -g pnpm`) if it's missing, so this step is optional.

Verify:
```bash
pnpm -v
```

### git

macOS: pre-installed or `brew install git`
Linux: `apt install git` / `dnf install git`
Windows: `winget install Git.Git` or https://git-scm.com/

### Claude Code CLI

Installation:
- https://claude.com/claude-code

Verify:
```bash
claude --version
```

## Recommended

### gh (GitHub CLI)

For automated repo creation in the bootstrap skill.

```bash
brew install gh
gh auth login
```

Skip if you create repos manually.

## Skip Checks

The installer fails if required commands are missing. To bypass for testing:

```bash
# macOS / Linux / WSL / Git Bash
SKIP_PREREQ=1 bash scripts/install.sh
```
```powershell
# Windows / PowerShell
$env:SKIP_PREREQ="1"; node scripts/install.mjs
```

(Not recommended — rules will install but the bootstrap skill will fail at runtime.)

## Platform notes

The installer and all shipped scripts are cross-platform Node.js (`scripts/*.mjs`). They run natively on **macOS, Linux, and Windows**:

- **macOS / Linux / WSL2 / Git Bash:** use the `bash` one-liners; the `.sh` files are thin shims that call `node`.
- **Windows (PowerShell / cmd):** use the `node scripts/install.mjs` form or the PowerShell bootstrap (`scripts/bootstrap.ps1`). No bash, WSL, or Git Bash required.
- Owner-only secret-file permissions are applied via `chmod 600` on POSIX and `icacls` on Windows.
