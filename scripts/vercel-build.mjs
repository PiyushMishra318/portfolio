/**
 * Portfolio Vercel build: clone product repos (not in git), install, and build.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PRODUCTS } from "./products-manifest.mjs";

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
  "postman-to-swagger": "postman-to-swagger",
  "realtime-text-readtime": "htmx-reading-time",
  "SVG-Palette-Processor": "SVG-Palette-Processor",
  transcribe: "transcribe",
  "Tsukiyomi-Platform": "Tsukiyomi-Platform",
  "website-page-speed-report": "website-page-speed-report",
  wingman: "wingman",
  XBat: "XBat",
};

/** Product folders with static landings in bundled-products/ — skip clone when bundle exists. */
const BUNDLED_FOLDERS = new Set(
  Object.values(PRODUCTS)
    .filter((p) => p.bundlePath && p.skipClone && existsSync(join(root, p.bundlePath)))
    .map((p) => p.folder),
);

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
    if (BUNDLED_FOLDERS.has(folder)) {
      console.log(`[vercel-build] skip clone ${folder} (bundled static landing)`);
      continue;
    }
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

// Overlay bundled landing pages onto cloned product public/ directories.
// This ensures custom-designed landings survive Vercel's fresh clone.
function overlayBundledLandings() {
  for (const product of Object.values(PRODUCTS)) {
    if (!product.bundlePath) continue;
    const bundleDir = join(root, product.bundlePath);
    if (!existsSync(bundleDir)) continue;
    const productPublic = join(productsRoot, product.folder, "public");
    if (!existsSync(productPublic)) mkdirSync(productPublic, { recursive: true });
    for (const file of ["index.html", "styles.css"]) {
      const src = join(bundleDir, file);
      if (existsSync(src)) {
        const dest = join(productPublic, file);
        copyFileSync(src, dest);
        console.log(`[vercel-build] overlay ${product.folder}/public/${file}`);
      }
    }
  }
}

overlayBundledLandings();

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

console.log("[vercel-build] done");
