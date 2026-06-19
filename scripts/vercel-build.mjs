/**
 * Portfolio Vercel build: clone product repos (not in git), install, and build.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const productsRoot = join(root, "products");

/** Local folder name → GitHub repo name (PiyushMishra318/<repo>). */
const PRODUCT_REPOS = {
  BackgroundRemover: "Threshold-Background-Cutout",
  "Canvas-Js-Games": "HTML5-Canvas-Mini-Games",
  CodeDiff: "CodeDiff",
  "coot-parser--experimental": "canvas-component-parser",
  "django-learning-projects": "django-learning-projects",
  "Email-Validation": "Email-Validation",
  "ESP8266-DHT11-Google-Sheets-Logger": "ESP8266-DHT11-Google-Sheets-Logger",
  lambda: "lambda",
  lumina: "lumina",
  "piyush-playground": "piyush-playground",
  "postman-to-swagger": "postman-to-swagger",
  "realtime-text-readtime": "htmx-reading-time",
  "SVG-Palette-Processor": "SVG-Palette-Processor",
  transcribe: "transcribe",
  "Tsukiyomi-Platform": "Tsukiyomi-Platform",
  "website-page-speed-report": "website-page-speed-report",
  wingman: "wingman",
  XBat: "XBat",
};

function run(cmd, cwd, label, { optional = false } = {}) {
  console.log(`[vercel-build] ${label}: ${cmd}`);
  const r = spawnSync(cmd, { cwd, shell: true, stdio: "inherit", env: process.env });
  if (r.status !== 0) {
    if (optional) {
      console.warn(`[vercel-build] ${label} failed (continuing)`);
      return false;
    }
    process.exit(r.status ?? 1);
  }
  return true;
}

function cloneUrl(repo) {
  const token = process.env.GITHUB_TOKEN || process.env.VERCEL_GITHUB_TOKEN;
  if (!token) return `https://github.com/PiyushMishra318/${repo}.git`;
  return `https://x-access-token:${token}@github.com/PiyushMishra318/${repo}.git`;
}

function hasProduct(dir) {
  return (
    existsSync(join(dir, "package.json")) ||
    existsSync(join(dir, "public", "index.html")) ||
    existsSync(join(dir, "index.html"))
  );
}

function ensureProducts() {
  if (!existsSync(productsRoot)) mkdirSync(productsRoot, { recursive: true });

  for (const [folder, repo] of Object.entries(PRODUCT_REPOS)) {
    const dir = join(productsRoot, folder);
    if (hasProduct(dir)) {
      console.log(`[vercel-build] skip clone ${folder} (present)`);
      continue;
    }
    run(
      `git clone --depth 1 "${cloneUrl(repo)}" "${dir}"`,
      root,
      `clone ${repo}`,
      { optional: true },
    );
  }
}

function npmIn(dir, script) {
  if (!existsSync(join(dir, "package.json"))) return;
  run("npm install", dir, `install ${dir}`, { optional: true });
  if (script) run(`npm run ${script}`, dir, `build ${dir}`, { optional: true });
}

ensureProducts();

const apiProducts = [
  "CodeDiff",
  "Email-Validation",
  "lambda",
  "postman-to-swagger",
  "realtime-text-readtime",
  "coot-parser--experimental",
];

for (const folder of apiProducts) {
  npmIn(join(productsRoot, folder));
}

npmIn(join(productsRoot, "website-page-speed-report"), "build");
npmIn(join(productsRoot, "Tsukiyomi-Platform", "apps", "server"), "build");
npmIn(join(productsRoot, "piyush-playground"), "build");

console.log("[vercel-build] done");
