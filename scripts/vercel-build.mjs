/**
 * Portfolio Vercel build: product builds needed before deploy.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd, cwd, label) {
  console.log(`[vercel-build] ${label}: ${cmd}`);
  const r = spawnSync(cmd, { cwd, shell: true, stdio: "inherit", env: process.env });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function npmIn(dir, script) {
  if (!existsSync(join(dir, "package.json"))) return;
  run("npm install", dir, `install ${dir}`);
  if (script) run(`npm run ${script}`, dir, `build ${dir}`);
}

const apiProducts = [
  "CodeDiff",
  "Email-Validation",
  "lambda",
  "postman-to-swagger",
  "realtime-text-readtime",
  "coot-parser--experimental",
];

for (const folder of apiProducts) {
  npmIn(join(root, "products", folder));
}

npmIn(join(root, "products", "website-page-speed-report"), "build");
npmIn(join(root, "products", "Tsukiyomi-Platform", "apps", "server"), "build");
npmIn(join(root, "products", "piyush-playground"), "build");

console.log("[vercel-build] done");
