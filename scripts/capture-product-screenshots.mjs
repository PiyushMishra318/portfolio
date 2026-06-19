/**
 * Capture product landing screenshots (starts preview server internally).
 * Run: node scripts/capture-product-screenshots.mjs
 */
import { spawn } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const PORT = Number(process.env.PORT) || 4173;

const SLUGS = [
  "background-remover", "canvas-games", "codediff", "coot-parser", "django-learning",
  "email-validation", "tracktemp", "lambda", "lumina", "playground", "postman-to-swagger",
  "readtime", "svg-palette", "talkative", "transcribe", "tsukiyomi", "page-speed", "wingman", "xbat",
];

const serverProc = spawn(process.execPath, ["scripts/preview-local.mjs"], {
  cwd: root,
  stdio: "pipe",
  env: { ...process.env, PORT: String(PORT) },
});

await new Promise((r) => setTimeout(r, 2000));

const BASE = `http://127.0.0.1:${PORT}`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

let captured = 0;
const failed = [];

try {
  for (const slug of SLUGS) {
    const landscape = join(root, `product-${slug}-landscape.png`);
    try {
      const res = await page.goto(`${BASE}/products/${slug}/`, {
        waitUntil: "networkidle",
        timeout: 45000,
      });
      if (!res || !res.ok()) throw new Error(`HTTP ${res?.status()}`);
      await page.waitForTimeout(1500);
      const landscape = join(root, `product-${slug}-landscape.png`);
      const resized = join(root, `product-${slug}-resized.png`);
      await page.screenshot({ path: landscape });
      await page.screenshot({ path: resized });
      captured++;
      console.log("ok", slug);
    } catch (err) {
      failed.push(slug);
      console.error("fail", slug, err.message);
    }
  }
} finally {
  await browser.close();
  serverProc.kill();
}

console.log(JSON.stringify({ captured, failed }, null, 2));
process.exit(failed.length ? 1 : 0);
