/**
 * Security audit regression runner — runs every check harness in scripts/audit
 * sequentially. Each check exits 0/1 on its own; this wrapper aggregates.
 *
 * Wired into package.json as `npm run audit`. NEVER run against production —
 * the underlying scripts create real Supabase users and spend credits.
 */

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const scripts = [
  "test_rls.ts",
  "test_idor.ts",
  "test_race.ts",
];

const here = resolve(__dirname);
let failures = 0;

for (const script of scripts) {
  const path = resolve(here, script);
  console.log(`\n================ ${script} ================`);
  const result = spawnSync("npx", ["tsx", path], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    failures++;
    console.error(`${script} FAILED (exit ${result.status})`);
  } else {
    console.log(`${script} PASSED`);
  }
}

console.log(`\n================ Summary ================`);
console.log(`${scripts.length - failures}/${scripts.length} scripts passed.`);
process.exit(failures === 0 ? 0 : 1);
