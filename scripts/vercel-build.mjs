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
  talkative: "talkative",
  transcribe: "transcribe",
  "Tsukiyomi-Platform": "Tsukiyomi-Platform",
  "website-page-speed-report": "website-page-speed-report",
  wingman: "wingman",
  XBat: "XBat",
};

function run(cmd, cwd, label) {
  console.log(`[vercel-build] ${label}: ${cmd}`);
  const r = spawnSync(cmd, { cwd, shell: true, stdio: "inherit", env: process.env });
  if (r.status !== 0) process.exit(r.status ?? 1);
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
      `git clone --depth 1 "https://github.com/PiyushMishra318/${repo}.git" "${dir}"`,
      root,
      `clone ${repo}`,
    );
  }
}

function npmIn(dir, script) {
  if (!existsSync(join(dir, "package.json"))) return;
  run("npm install", dir, `install ${dir}`);
  if (script) run(`npm run ${script}`, dir, `build ${dir}`);
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
