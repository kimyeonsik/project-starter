// scripts/lib/skill-resolver.mjs
// Self-healing for moved/renamed external skills.
//
// External skills are pinned as "owner/repo@skill" in registry.mjs. When an
// upstream repo is renamed or split (e.g. vercel-labs/skills →
// vercel-labs/agent-skills), `skills add` fails for that pin. This module
// parses `npx skills find <skill>` output to locate the canonical new home:
// the EXACT same skill name, ranked by install count (a proxy for the
// official/most-trusted source). Pure functions — unit-tested, no I/O.

const ANSI = /\x1b\[[0-9;?]*[a-zA-Z]/g;

// "459.3K" → 459300, "1.2M" → 1200000, "287" → 287, "100K+" → 100000.
export function parseInstalls(raw) {
  const m = String(raw).trim().match(/^([\d.]+)\s*([KM])?\+?/);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  if (Number.isNaN(n)) return 0;
  const mult = m[2] === 'M' ? 1e6 : m[2] === 'K' ? 1e3 : 1;
  return Math.round(n * mult);
}

// Parse `npx skills find` stdout into [{ ownerRepo, skill, installs }].
// Matches lines like: "vercel-labs/agent-skills@vercel-react-best-practices 459.3K installs"
function parseCandidates(findOutput) {
  const text = String(findOutput).replace(ANSI, '');
  const re = /^\s*([\w.-]+\/[\w.-]+)@([\w.-]+)\s+([\d.]+[KM]?\+?)\s+installs?/gm;
  const out = [];
  for (const m of text.matchAll(re)) {
    out.push({ ownerRepo: m[1], skill: m[2], installs: parseInstalls(m[3]) });
  }
  return out;
}

// Given a failed skill name and `npx skills find` output, return the owner/repo
// of the canonical replacement, or null. Exact name match only; ranked by
// installs desc. `opts.exclude` drops a known-dead owner/repo from the running.
export function resolveMovedSkill(skillName, findOutput, opts = {}) {
  const { exclude } = opts;
  const matches = parseCandidates(findOutput)
    .filter((c) => c.skill === skillName)
    .filter((c) => c.ownerRepo !== exclude)
    .sort((a, b) => b.installs - a.installs);
  return matches.length ? matches[0].ownerRepo : null;
}
