#!/usr/bin/env node
// project-starter: interactive secret setup (cross-platform: macOS / Linux / Windows)
//
// Why this exists: keep API keys / tokens out of AI conversations.
// You paste secrets directly into this script's hidden prompt; the value is
// written to .env.local with owner-only permissions and never echoed to stdout
// (only a masked preview is shown).
//
// Usage:
//   node setup-secrets.mjs                          # interactive menu
//   SERVICE=supabase node setup-secrets.mjs         # single service
//   ENV_FILE=./.env.production node setup-secrets.mjs
//   DRY_RUN=1 node setup-secrets.mjs                # preview without writing
//
// On Windows, owner-only perms are applied via icacls; on POSIX via chmod 600.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';

// This script is intentionally self-contained (only Node builtins) so it can be
// run standalone via the remote one-liner without the rest of the repo present.

const IS_WIN = process.platform === 'win32';
const USE_COLOR = !process.env.NO_COLOR && process.stdout.isTTY;
const color = (c, s) => (USE_COLOR ? `\x1b[${c}m${s}\x1b[0m` : s);
const info = (...a) => console.log(`${color('1;34', '▸')} ${a.join(' ')}`);
const ok = (...a) => console.log(`${color('1;32', '✓')} ${a.join(' ')}`);
const warn = (...a) => console.log(`${color('1;33', '!')} ${a.join(' ')}`);
const err = (...a) => console.error(`${color('1;31', '✗')} ${a.join(' ')}`);
const hr = () =>
  console.log('────────────────────────────────────────────────────────');

function timestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-` +
    `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  );
}

function exists(p) {
  try {
    fs.lstatSync(p);
    return true;
  } catch {
    return false;
  }
}

function copyRecursive(src, dest) {
  fs.cpSync(src, dest, { recursive: true });
}

// chmod 600 equivalent — POSIX chmod, Windows icacls. Never throws.
function chmodSecret(file) {
  if (IS_WIN) {
    try {
      const user = os.userInfo().username;
      spawnSync('icacls', [file, '/inheritance:r'], { stdio: 'ignore' });
      spawnSync('icacls', [file, '/grant:r', `${user}:F`], { stdio: 'ignore' });
    } catch {
      warn(`Could not restrict permissions on ${file} (Windows ACL).`);
    }
    return;
  }
  try {
    fs.chmodSync(file, 0o600);
  } catch {
    /* non-fatal */
  }
}

// Replace an existing KEY= line or append. Returns new file content.
function upsertEnv(content, key, val) {
  const lines = content.length ? content.split('\n') : [];
  let updated = false;
  const out = lines.map((line) => {
    if (line.startsWith(`${key}=`)) {
      updated = true;
      return `${key}=${val}`;
    }
    return line;
  });
  if (!updated) {
    while (out.length && out[out.length - 1] === '') out.pop();
    out.push(`${key}=${val}`);
    out.push('');
  }
  return out.join('\n');
}

function prompt(question, def = '') {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim() || def);
    });
  });
}

async function confirm(question) {
  const ans = (await prompt(`${question} [y/N]: `)).toLowerCase();
  return ans === 'y' || ans === 'yes';
}

// Hidden input (no echo). Works on Windows and POSIX TTYs.
function promptHidden(question) {
  return new Promise((resolve) => {
    process.stderr.write(question);
    const input = process.stdin;
    const wasRaw = input.isRaw;
    if (input.isTTY) input.setRawMode(true);
    input.resume();
    let value = '';
    const cleanup = () => {
      input.removeListener('data', onData);
      if (input.isTTY) input.setRawMode(wasRaw);
      input.pause();
    };
    const onData = (chunk) => {
      const s = chunk.toString('utf8');
      for (const ch of s) {
        const code = ch.charCodeAt(0);
        if (ch === '\n' || ch === '\r' || code === 4) {
          cleanup();
          process.stderr.write('\n');
          resolve(value);
          return;
        } else if (code === 3) {
          cleanup();
          process.stderr.write('\n');
          process.exit(130);
        } else if (code === 127 || code === 8) {
          value = value.slice(0, -1);
        } else if (code >= 32) {
          value += ch;
        }
      }
    };
    input.on('data', onData);
  });
}

function mask(val) {
  if (val.length <= 8) return '••••';
  return `${val.slice(0, 4)}••••${val.slice(-4)}`;
}

const env = process.env;
const ENV_FILE = env.ENV_FILE || './.env.local';
const DRY_RUN = env.DRY_RUN === '1';
let backupDone = false;

// ---------- env file ops ----------
function ensureEnvFile() {
  if (DRY_RUN) return;
  fs.mkdirSync(path.dirname(path.resolve(ENV_FILE)), { recursive: true });
  if (!exists(ENV_FILE)) {
    fs.writeFileSync(ENV_FILE, '');
    chmodSecret(ENV_FILE);
    return;
  }
  if (!backupDone) {
    const bak = `${ENV_FILE}.backup-${timestamp()}`;
    copyRecursive(ENV_FILE, bak);
    chmodSecret(bak);
    ok(`Backed up to ${bak}`);
    backupDone = true;
  }
  chmodSecret(ENV_FILE);
}

function upsert(key, val) {
  if (DRY_RUN) {
    info(`[dry-run] would set ${key}=${mask(val)}`);
    return;
  }
  ensureEnvFile();
  const content = exists(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf8') : '';
  fs.writeFileSync(ENV_FILE, upsertEnv(content, key, val));
  chmodSecret(ENV_FILE);
  ok(`Set ${key} = ${mask(val)}`);
}

// Prompt + validate (regex). Empty input skips. Up to 3 retries on bad format.
async function promptValidated(label, key, regex) {
  let attempt = 0;
  for (;;) {
    const val = await promptHidden(`  ${label}: `);
    if (!val) {
      warn('(skipped)');
      return false;
    }
    if (regex && !regex.test(val)) {
      attempt += 1;
      warn(`Format unexpected for ${key} (pattern: ${regex.source})`);
      if (attempt >= 3) {
        err('Skipped after 3 invalid attempts.');
        return false;
      }
      continue;
    }
    upsert(key, val);
    return true;
  }
}

// ============================================================
// Service handlers
// ============================================================

async function setupSupabase() {
  hr();
  info('Supabase');
  hr();
  console.log(`Variables this writes:
  NEXT_PUBLIC_SUPABASE_URL        public — exposed to browser
  NEXT_PUBLIC_SUPABASE_ANON_KEY   public — anon role (RLS applies)
  SUPABASE_SERVICE_ROLE_KEY       SECRET — bypasses RLS, server-only
  SUPABASE_ACCESS_TOKEN           CLI/MCP token (outside the app)

Where to get them:
  • URL + anon + service_role:
      https://supabase.com/dashboard/project/_/settings/api
  • Access token (for CLI / MCP server):
      https://supabase.com/dashboard/account/tokens
      → "Generate new token" → scope: All projects (or specific)

Security:
  • SERVICE_ROLE_KEY must NEVER appear in client bundles
  • Rotate at the same URLs if exposed`);
  console.log('');
  if (!(await confirm('Paste keys now?'))) return;
  await promptValidated('NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/);
  await promptValidated('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', /^(eyJ|sbp_)/);
  await promptValidated('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY', /^(eyJ|sbs_)/);
  await promptValidated('SUPABASE_ACCESS_TOKEN (sbp_)', 'SUPABASE_ACCESS_TOKEN', /^sbp_[A-Za-z0-9]+$/);
}

async function setupVercel() {
  hr();
  info('Vercel');
  hr();
  console.log(`Variables this writes:
  VERCEL_TOKEN   SECRET — account access

Where to get it:
  • https://vercel.com/account/tokens
  → "Create Token"
  → Scope: "Full Account" (or a specific team for less blast radius)
  → Expiration: set a date, do not pick "No Expiration" for shared machines

Security:
  • Token can deploy/delete every project you own
  • Rotate at the same URL if leaked`);
  console.log('');
  if (!(await confirm('Paste token now?'))) return;
  await promptValidated('VERCEL_TOKEN', 'VERCEL_TOKEN', /^[A-Za-z0-9]{24,}$/);
}

async function setupSentry() {
  hr();
  info('Sentry');
  hr();
  console.log(`Variables this writes:
  NEXT_PUBLIC_SENTRY_DSN   semi-public — OK in browser (rate-limited)
  SENTRY_ORG               org slug (e.g. "yk-projects")
  SENTRY_PROJECT           project slug (e.g. "class-vietnamu")
  SENTRY_AUTH_TOKEN        SECRET — used for source map upload at build time

Where to get them:
  • DSN: <project>/settings/keys (Client Keys → DSN)
      Format: https://<key>@<org>.ingest.<region>.sentry.io/<id>
  • Org slug: visible in the URL after sentry.io/
  • Project slug: project settings → general
  • Auth token: https://sentry.io/settings/account/api/auth-tokens/
      → "Create New Token"
      → Required scope (minimum): project:releases
      → Add org:read if releases include multiple projects

Security:
  • Auth token must be server-only
  • DSN is intentionally semi-public; Sentry enforces rate limits`);
  console.log('');
  if (!(await confirm('Paste values now?'))) return;
  await promptValidated('NEXT_PUBLIC_SENTRY_DSN', 'NEXT_PUBLIC_SENTRY_DSN', /^https:\/\/[^@/]+@[^/]+\.ingest\.[^/]*sentry\.io\/[0-9]+$/);
  await promptValidated('SENTRY_ORG (slug)', 'SENTRY_ORG', /^[a-z0-9-]+$/);
  await promptValidated('SENTRY_PROJECT (slug)', 'SENTRY_PROJECT', /^[a-z0-9-]+$/);
  await promptValidated('SENTRY_AUTH_TOKEN', 'SENTRY_AUTH_TOKEN', /^(sntrys_|sntryu_)/);
}

async function setupAmplitude() {
  hr();
  info('Amplitude');
  hr();
  console.log(`Variables this writes:
  NEXT_PUBLIC_AMPLITUDE_API_KEY   public — 32-char hex

Where to get it:
  • https://app.amplitude.com/settings/projects
  → Select project → General → API Key
  → Consider separate Amplitude projects for dev / staging / prod

Security:
  • Public key is rate-limited by Amplitude
  • Secret key (for server-side ingest) is rarely needed`);
  console.log('');
  if (!(await confirm('Paste key now?'))) return;
  await promptValidated('NEXT_PUBLIC_AMPLITUDE_API_KEY', 'NEXT_PUBLIC_AMPLITUDE_API_KEY', /^[a-f0-9]{32}$/);
}

async function setupCloudflare() {
  hr();
  info('Cloudflare');
  hr();
  console.log(`Variables this writes:
  CLOUDFLARE_ACCOUNT_ID   32 hex chars, visible in dashboard sidebar
  CLOUDFLARE_API_TOKEN    SECRET — scoped permissions

Where to get them:
  • Account ID:
      https://dash.cloudflare.com → right sidebar shows "Account ID"
  • API Token:
      https://dash.cloudflare.com/profile/api-tokens
      → "Create Token" → "Custom token" with:

         Account → Workers Scripts        → Edit
         Account → Account Settings       → Read
         Zone    → Workers Routes         → Edit  (if using custom routes)
         Account → D1                     → Edit  (if using D1)
         Account → R2                     → Edit  (if using R2)
         Account → Workers KV Storage     → Edit  (if using KV)

      Account Resources: Include → All accounts (or specific)
      Zone Resources:    Include → All zones (or specific)
      Client IP Filter:  leave blank
      TTL:               set an expiration

Security:
  • Token bypasses 2FA — treat as a password
  • Use the minimum scopes needed; rotate at the same URL`);
  console.log('');
  if (!(await confirm('Paste values now?'))) return;
  await promptValidated('CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_ACCOUNT_ID', /^[a-f0-9]{32}$/);
  await promptValidated('CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_API_TOKEN', /^[A-Za-z0-9_-]{40,}$/);
}

async function setupAnthropic() {
  hr();
  info('Anthropic');
  hr();
  console.log(`Variables this writes:
  ANTHROPIC_API_KEY   SECRET — server-only

Where to get it:
  • https://console.anthropic.com/settings/keys
  → "Create Key" → name it (e.g. "class-vietnamu-dev")
  → Workspace: pick the right one
  → Copy IMMEDIATELY — the key is shown only once

Security:
  • Never expose in client bundles
  • Set spend limits at https://console.anthropic.com/settings/limits
  • Rotate immediately if leaked`);
  console.log('');
  if (!(await confirm('Paste key now?'))) return;
  await promptValidated('ANTHROPIC_API_KEY (sk-ant-)', 'ANTHROPIC_API_KEY', /^sk-ant-[A-Za-z0-9_-]+$/);
}

async function setupCustom() {
  hr();
  info('Custom secret');
  hr();
  console.log('Use this when the service is not in the menu.');
  console.log('Variable name must be UPPER_SNAKE_CASE (e.g. MY_API_KEY).');
  console.log('');
  const key = await prompt('Variable name: ');
  if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) {
    err('Invalid name. Skipped.');
    return;
  }
  const val = await promptHidden('  Value (hidden): ');
  if (!val) {
    warn('(skipped: empty)');
    return;
  }
  upsert(key, val);
}

// ---------- validate ----------
function validateEnv() {
  hr();
  info(`Validating ${ENV_FILE}`);
  hr();
  if (!exists(ENV_FILE)) {
    err(`${ENV_FILE} not found`);
    return;
  }
  const check = (key, val, re) =>
    re.test(val) ? ok(`${key} OK`) : warn(`${key} format unexpected`);
  let count = 0;
  for (const line of fs.readFileSync(ENV_FILE, 'utf8').split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq);
    const val = line.slice(eq + 1);
    count += 1;
    switch (key) {
      case 'NEXT_PUBLIC_SUPABASE_URL':
        check(key, val, /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/);
        break;
      case 'NEXT_PUBLIC_SUPABASE_ANON_KEY':
      case 'SUPABASE_SERVICE_ROLE_KEY':
        check(key, val, /^eyJ/);
        break;
      case 'SUPABASE_ACCESS_TOKEN':
        check(key, val, /^sbp_/);
        break;
      case 'VERCEL_TOKEN':
        check(key, val, /^[A-Za-z0-9]{24,}$/);
        break;
      case 'NEXT_PUBLIC_SENTRY_DSN':
        check(key, val, /^https:\/\/[^@/]+@[^/]+\.ingest\..*sentry\.io\/[0-9]+$/);
        break;
      case 'SENTRY_AUTH_TOKEN':
        check(key, val, /^(sntrys_|sntryu_)/);
        break;
      case 'NEXT_PUBLIC_AMPLITUDE_API_KEY':
      case 'CLOUDFLARE_ACCOUNT_ID':
        check(key, val, /^[a-f0-9]{32}$/);
        break;
      case 'CLOUDFLARE_API_TOKEN':
        check(key, val, /^[A-Za-z0-9_-]{40,}$/);
        break;
      case 'ANTHROPIC_API_KEY':
        check(key, val, /^sk-ant-/);
        break;
      default:
        ok(`${key} set (${mask(val)})`);
    }
  }
  console.log('');
  info(`Total: ${count} variable(s)`);
}

// ---------- gitignore check ----------
function checkGitignore() {
  const gi = './.gitignore';
  const base = path.basename(ENV_FILE);
  if (!exists(gi)) {
    warn(`${base} is NOT clearly gitignored. Add this line to .gitignore before committing:`);
    console.log(`    ${base}`);
    return;
  }
  const content = fs.readFileSync(gi, 'utf8');
  const escaped = base.replace(/\./g, '\\.');
  const byName = new RegExp(`(^|/)${escaped}($|/|\\s)`, 'm');
  const byPattern = /^\.env\.\*?$|^\.env\.local$|^\*\.env/m;
  if (byName.test(content)) {
    ok(`${base} is gitignored`);
  } else if (byPattern.test(content)) {
    ok('Env files are gitignored (pattern match)');
  } else {
    warn(`${base} is NOT clearly gitignored. Add this line to .gitignore before committing:`);
    console.log(`    ${base}`);
  }
}

// ---------- menu ----------
const HANDLERS = {
  supabase: setupSupabase,
  vercel: setupVercel,
  sentry: setupSentry,
  amplitude: setupAmplitude,
  cloudflare: setupCloudflare,
  anthropic: setupAnthropic,
  custom: setupCustom,
};

function showMenu() {
  console.log('');
  hr();
  console.log('project-starter: secret setup');
  hr();
  console.log(`Target env file: ${ENV_FILE}`);
  if (DRY_RUN) warn('Mode: DRY RUN (no writes)');
  console.log('');
  console.log('  1) Supabase');
  console.log('  2) Vercel');
  console.log('  3) Sentry');
  console.log('  4) Amplitude');
  console.log('  5) Cloudflare');
  console.log('  6) Anthropic');
  console.log('  7) Custom secret');
  console.log(`  v) Validate ${ENV_FILE}`);
  console.log('  q) Quit');
  console.log('');
}

async function main() {
  const service = env.SERVICE;
  if (service) {
    const s = service.toLowerCase();
    if (s === 'validate') {
      validateEnv();
    } else if (HANDLERS[s]) {
      await HANDLERS[s]();
    } else {
      err(`Unknown SERVICE: ${service}`);
      process.exit(1);
    }
    checkGitignore();
    return;
  }

  const byNumber = {
    1: 'supabase',
    2: 'vercel',
    3: 'sentry',
    4: 'amplitude',
    5: 'cloudflare',
    6: 'anthropic',
    7: 'custom',
  };
  for (;;) {
    showMenu();
    const choice = (await prompt('Choice: ')).toLowerCase();
    if (choice === 'q' || choice === 'quit' || choice === 'exit') break;
    if (choice === '') continue;
    if (choice === 'v') {
      validateEnv();
    } else if (byNumber[choice]) {
      await HANDLERS[byNumber[choice]]();
    } else {
      warn(`Unknown choice: ${choice}`);
    }
    console.log('');
    const next = (await prompt('Press Enter to return, or q to quit: ')).toLowerCase();
    if (next === 'q' || next === 'quit' || next === 'exit') break;
  }
  console.log('');
  checkGitignore();
  ok('Done.');
}

main();
