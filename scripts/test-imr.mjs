/**
 * Smoke test: rotate overlay (.imr) visibility by viewport class.
 * Run from portfolio/: node scripts/test-imr.mjs
 */
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
};

function serve() {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const path = req.url?.split("?")[0] || "/";
      const file =
        path === "/"
          ? join(root, "index.html")
          : join(root, path.replace(/^\//, ""));
      if (!existsSync(file)) {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      const ext = extname(file);
      res.writeHead(200, {
        "Content-Type": MIME[ext] || "application/octet-stream",
      });
      res.end(readFileSync(file));
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
    server.on("error", reject);
  });
}

async function imrVisible(page) {
  return page.evaluate(() => {
    const el = document.querySelector(".imr");
    if (!el) return false;
    const s = getComputedStyle(el);
    return s.display !== "none" && s.visibility !== "hidden" && s.opacity !== "0";
  });
}

async function htmlClass(page) {
  return page.evaluate(() => document.documentElement.className);
}

const server = await serve();
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;
const browser = await chromium.launch();

try {
  // Desktop 1440×900 — fine pointer, no rotate overlay
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const dPage = await desktop.newPage();
  await dPage.goto(`${base}/index.html`, { waitUntil: "domcontentloaded" });
  await dPage.waitForTimeout(300);
  const dClass = await htmlClass(dPage);
  const dVisible = await imrVisible(dPage);
  if (!dClass.includes("desktop") || dVisible) {
    throw new Error(
      `desktop 1440x900: class=${dClass} imrVisible=${dVisible} (expected desktop, hidden)`
    );
  }
  await desktop.close();

  // Phone portrait 390×844 — overlay hidden in portrait
  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const pPage = await phone.newPage();
  await pPage.goto(`${base}/index.html`, { waitUntil: "domcontentloaded" });
  await pPage.waitForTimeout(300);
  const pClass = await htmlClass(pPage);
  const pVisible = await imrVisible(pPage);
  if (!pClass.includes("phone") || pVisible) {
    throw new Error(
      `phone 390x844: class=${pClass} imrVisible=${pVisible} (expected phone, hidden)`
    );
  }
  await phone.close();

  // Phone landscape 844×390 — coarse touch, overlay shown
  const landscape = await browser.newContext({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    isMobile: true,
  });
  const lPage = await landscape.newPage();
  await lPage.goto(`${base}/index.html`, { waitUntil: "domcontentloaded" });
  await lPage.waitForTimeout(300);
  const lClass = await htmlClass(lPage);
  const lVisible = await imrVisible(lPage);
  if (!lClass.includes("phone") || !lVisible) {
    throw new Error(
      `phone 844x390: class=${lClass} imrVisible=${lVisible} (expected phone, visible)`
    );
  }
  await landscape.close();

  console.log("imr test ok: desktop hidden, phone portrait hidden, phone landscape visible");
} finally {
  await browser.close();
  server.close();
}
