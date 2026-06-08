// project-starter shared helpers (cross-platform: macOS / Linux / Windows)
//
// Zero external dependencies — must run from a fresh `git clone` with only a
// Node 20+ runtime available. ESM module.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

export const IS_WIN = process.platform === 'win32';

// ---------- color / logging ----------
// ANSI works on Windows Terminal and Win10+ consoles with VT processing.
// Honour NO_COLOR (https://no-color.org) and non-TTY output.
const USE_COLOR = !process.env.NO_COLOR && process.stdout.isTTY;
function color(code, s) {
  return USE_COLOR ? `\x1b[${code}m${s}\x1b[0m` : s;
}
export const info = (...a) => console.log(`${color('1;34', '▸')} ${a.join(' ')}`);
export const ok = (...a) => console.log(`${color('1;32', '✓')} ${a.join(' ')}`);
export const warn = (...a) => console.log(`${color('1;33', '!')} ${a.join(' ')}`);
export const err = (...a) => console.error(`${color('1;31', '✗')} ${a.join(' ')}`);
export const hr = () =>
  console.log('────────────────────────────────────────────────────────');

// ---------- timestamps ----------
export function timestamp() {
  // Local time, matching `date +%Y%m%d-%H%M%S`
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-` +
    `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  );
}

export function isoUtc() {
  // Matches `date -u +%Y-%m-%dT%H:%M:%SZ`
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

// ---------- command detection (cross-platform `command -v`) ----------
export function which(cmd) {
  if (IS_WIN) {
    // `where` resolves PATH and PATHEXT (.cmd/.exe/.bat shims).
    return spawnSync('where', [cmd], { stdio: 'ignore' }).status === 0;
  }
  // `command -v` is a POSIX shell builtin.
  return (
    spawnSync('sh', ['-c', `command -v ${JSON.stringify(cmd)}`], {
      stdio: 'ignore',
    }).status === 0
  );
}

// ---------- subprocess runner ----------
// On Windows, npm/npx/pnpm/corepack are .cmd shims that require shell:true.
export function run(cmd, args = [], opts = {}) {
  return spawnSync(cmd, args, {
    stdio: opts.quiet ? 'ignore' : 'inherit',
    shell: IS_WIN,
    encoding: 'utf8',
    ...opts,
  });
}

// Capture stdout of a command (quietly). Returns trimmed stdout or '' on failure.
export function capture(cmd, args = []) {
  const res = spawnSync(cmd, args, {
    stdio: ['ignore', 'pipe', 'ignore'],
    shell: IS_WIN,
    encoding: 'utf8',
  });
  return res.status === 0 ? (res.stdout || '').trim() : '';
}

// Run quietly, return true on exit code 0.
export function runOk(cmd, args = []) {
  return spawnSync(cmd, args, { stdio: 'ignore', shell: IS_WIN }).status === 0;
}

// ---------- filesystem helpers ----------
export function exists(p) {
  try {
    fs.lstatSync(p);
    return true;
  } catch {
    return false;
  }
}

export function copyRecursive(src, dest) {
  // fs.cpSync (Node 16.7+) handles both files and directories.
  fs.cpSync(src, dest, { recursive: true });
}

// Byte-for-byte equality of two files or directory trees. Used to skip
// re-backing-up / re-copying content that hasn't changed (idempotent re-install).
export function pathsIdentical(a, b) {
  if (!exists(a) || !exists(b)) return false;
  const sa = fs.statSync(a);
  const sb = fs.statSync(b);
  if (sa.isFile() && sb.isFile()) {
    return Buffer.compare(fs.readFileSync(a), fs.readFileSync(b)) === 0;
  }
  if (sa.isDirectory() && sb.isDirectory()) {
    const ea = fs.readdirSync(a).sort();
    const eb = fs.readdirSync(b).sort();
    if (ea.length !== eb.length || ea.some((n, i) => n !== eb[i])) return false;
    return ea.every((n) => pathsIdentical(path.join(a, n), path.join(b, n)));
  }
  return false;
}

// True if `dest` already contains every path in `src` with identical content.
// Unlike pathsIdentical, dest MAY have extra entries — e.g. the adopt skill gets
// an `engine/` dir bundled in after copy, so its dest legitimately has more than
// src. Lets the installer skip re-copying an already-up-to-date skill instead of
// churning a fresh backup of its bundle on every run.
export function destHasIdenticalSources(src, dest) {
  if (!exists(src) || !exists(dest)) return false;
  const ss = fs.statSync(src);
  if (ss.isFile()) {
    const sd = fs.statSync(dest);
    return sd.isFile() && Buffer.compare(fs.readFileSync(src), fs.readFileSync(dest)) === 0;
  }
  if (ss.isDirectory()) {
    if (!fs.statSync(dest).isDirectory()) return false;
    return fs.readdirSync(src).every((n) =>
      destHasIdenticalSources(path.join(src, n), path.join(dest, n)),
    );
  }
  return false;
}

// Back up an existing path before it is overwritten. Returns the backup path,
// or null if nothing existed. When backupRoot + baseDir are given, the copy is
// placed OUTSIDE the install tree at <backupRoot>/<ts>/<path-relative-to-baseDir>
// so skill/command loaders never rediscover it as a duplicate skill. Without
// them, falls back to a legacy sibling copy (`<target>.backup-<ts>`).
export function backupIfExists(target, ts, backupRoot, baseDir) {
  if (!exists(target)) return null;
  let bak;
  if (backupRoot && baseDir) {
    bak = path.join(backupRoot, ts, path.relative(baseDir, target));
    fs.mkdirSync(path.dirname(bak), { recursive: true });
  } else {
    bak = `${target}.backup-${ts}`;
  }
  copyRecursive(target, bak);
  warn(`Backed up: ${target} → ${bak}`);
  return bak;
}

// chmod 600 equivalent. On POSIX uses fs.chmod; on Windows restricts ACLs to
// the current user via icacls (best effort). Never throws.
export function chmodSecret(file) {
  if (IS_WIN) {
    try {
      const user = os.userInfo().username;
      // icacls is a real .exe — spawn WITHOUT a shell so paths/usernames with
      // spaces (e.g. C:\Users\John Doe\...) are passed as single args verbatim.
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

// Make shell scripts executable (POSIX only; no-op on Windows).
export function chmodExecAll(dir) {
  if (IS_WIN || !exists(dir)) return;
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith('.sh')) {
        try {
          fs.chmodSync(full, 0o755);
        } catch {
          /* non-fatal */
        }
      }
    }
  };
  walk(dir);
}

// ---------- managed block (CLAUDE.md) ----------
const BEGIN = '<!-- BEGIN project-starter -->';
const END = '<!-- END project-starter -->';

// Remove every managed block from text. Mirrors the awk skip logic.
export function stripManagedBlock(text) {
  const out = [];
  let skip = false;
  for (const line of text.split('\n')) {
    if (line.includes(BEGIN)) {
      skip = true;
      continue;
    }
    if (line.includes(END)) {
      skip = false;
      continue;
    }
    if (!skip) out.push(line);
  }
  return out.join('\n');
}

export function hasManagedBlock(text) {
  return text.includes(BEGIN);
}

export function wrapManagedBlock(templateBody) {
  const body = templateBody.endsWith('\n') ? templateBody : `${templateBody}\n`;
  return `${BEGIN}\n${body}${END}\n`;
}

// ---------- env file upsert ----------
// Replace an existing KEY= line or append. Returns the new file content.
export function upsertEnv(content, key, val) {
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

// ---------- interactive prompts ----------
export function prompt(question, def = '') {
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

export async function confirm(question) {
  const ans = (await prompt(`${question} [y/N]: `)).toLowerCase();
  return ans === 'y' || ans === 'yes';
}

// Hidden input (no echo) — for secrets. Works on Windows and POSIX TTYs.
export function promptHidden(question) {
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
          // Ctrl-C
          cleanup();
          process.stderr.write('\n');
          process.exit(130);
        } else if (code === 127 || code === 8) {
          // Backspace / Delete
          value = value.slice(0, -1);
        } else if (code >= 32) {
          value += ch;
        }
      }
    };
    input.on('data', onData);
  });
}

export function mask(val) {
  if (val.length <= 8) return '••••';
  return `${val.slice(0, 4)}••••${val.slice(-4)}`;
}

// Directory of a module given its import.meta.url (Windows-safe).
export function dirOf(metaUrl) {
  return path.dirname(fileURLToPath(metaUrl));
}
