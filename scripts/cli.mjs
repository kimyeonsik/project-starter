#!/usr/bin/env node
// scripts/cli.mjs — unified terminal entry. Routes subcommands to the existing
// engines (no logic here, just dispatch). Every command is plain Node — no AI
// tokens or Claude subscription — EXCEPT new-project bootstrap, which is an
// AI-driven skill (use it inside Claude Code), so there is no `bootstrap` here.
//
// Installed as a bin: after `npm link` (or `npm i -g <clone>`) run `project-starter <cmd>`.
// From the clone: `node scripts/cli.mjs <cmd>`.

import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { VERSION } from './lib/registry.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const USAGE = `project-starter v${VERSION}

Usage: project-starter <command> [options]

Commands:
  install            Install rules + skills (env: SCOPE, LANG_CHOICE, SKILL_BUNDLE)
  update [--skills]  Refresh an existing install to this version
  adopt [opts]       Apply to an EXISTING repo (opts: --lang ko|en, --dry-run, --verify; env: PROJECT_ROOT)
  inspect            Read-only preview of a repo            (= adopt --dry-run)
  verify             Check an applied install               (= adopt --verify)
  secrets            Inject API keys into .env.local (interactive; env: SERVICE)
  version            Print the version
  help               Show this help

New projects are bootstrapped by the 'new-project-bootstrap' skill inside Claude
Code (it's an AI workflow) — there is no 'bootstrap' terminal command.

Everything except bootstrap is plain Node: no AI tokens or Claude subscription needed.`;

function run(scriptRelPath, args) {
  const res = spawnSync('node', [path.join(REPO, scriptRelPath), ...args], { stdio: 'inherit' });
  process.exit(res.status ?? 1);
}

const [cmd, ...rest] = process.argv.slice(2);

switch (cmd) {
  case 'install': run('scripts/install.mjs', rest); break;
  case 'update': run('scripts/update.mjs', rest); break;
  case 'adopt': run('scripts/adopt.mjs', rest); break;
  case 'inspect': run('scripts/adopt.mjs', ['--dry-run', ...rest]); break;
  case 'verify': run('scripts/adopt.mjs', ['--verify', ...rest]); break;
  case 'secrets': run('skills/setup-secrets/setup-secrets.mjs', rest); break;
  case 'version': case '--version': case '-v':
    console.log(VERSION); break;
  case 'help': case '--help': case '-h': case undefined:
    console.log(USAGE); break;
  default:
    console.error(`Unknown command: ${cmd}\n`);
    console.error(USAGE);
    process.exit(1);
}
