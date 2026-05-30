# Prerequisites

## Required

### Node.js 20+

macOS:
```bash
brew install node@20
```

Other:
- Official: https://nodejs.org/
- Version manager (recommended): https://github.com/nvm-sh/nvm

Verify:
```bash
node -v   # should print v20.x or higher
```

### pnpm

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

Verify:
```bash
pnpm -v
```

### git

macOS: pre-installed or `brew install git`
Linux: `apt install git` / `dnf install git`

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
SKIP_PREREQ=1 bash scripts/install.sh
```

(Not recommended — rules will install but the bootstrap skill will fail at runtime.)
