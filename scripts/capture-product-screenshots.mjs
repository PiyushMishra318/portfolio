/**
 * Capture product landing screenshots + homepage mobile shot.
 * Assumes preview server is already running on PORT (default 4173).
 * Run: node --env-file=.env.local scripts/capture-product-screenshots.mjs
 */
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const PORT = Number(process.env.PORT) || 4173;
const BASE = `http://127.0.0.1:${PORT}`;

const SLUGS = [
  "background-remover", "canvas-games", "codediff", "coot-parser", "django-learning",
  "email-validation", "tracktemp", "lambda", "lumina", "postman-to-swagger",
  "readtime", "svg-palette", "talkative", "transcribe", "tsukiyomi", "page-speed", "wingman", "xbat",
];

const browser = await chromium.launch();
let captured = 0;
const failed = [];

try {
  // ── Product pages ────────────────────────────────────────────────────────
  // landscape: 1280×720 viewport hero shot (used as large card image)
  // resized:   640×360 viewport hero shot (used as small thumbnail)
  const desktopPage = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const thumbPage   = await browser.newPage({ viewport: { width: 640, height: 360 } });

  for (const slug of SLUGS) {
    try {
      // Landscape — 1280×720 hero viewport
      const res = await desktopPage.goto(`${BASE}/products/${slug}/`, {
        waitUntil: "networkidle",
        timeout: 45000,
      });
      if (!res || !res.ok()) throw new Error(`HTTP ${res?.status()}`);
      await desktopPage.evaluate(() => window.scrollTo(0, 0));
      await desktopPage.waitForTimeout(1200);
      await desktopPage.screenshot({
        path: join(root, `product-${slug}-landscape.png`),
        fullPage: false,
      });

      // Resized thumbnail — 640×360 hero viewport
      await thumbPage.goto(`${BASE}/products/${slug}/`, {
        waitUntil: "networkidle",
        timeout: 45000,
      });
      await thumbPage.evaluate(() => window.scrollTo(0, 0));
      await thumbPage.waitForTimeout(800);
      await thumbPage.screenshot({
        path: join(root, `product-${slug}-resized.png`),
        fullPage: false,
      });

      captured++;
      console.log("ok ", slug);
    } catch (err) {
      failed.push(slug);
      console.error("fail", slug, err.message);
    }
  }

  await desktopPage.close();
  await thumbPage.close();
} finally {
  await browser.close();
}

console.log(JSON.stringify({ captured, failed }, null, 2));
process.exit(failed.length ? 1 : 0);
