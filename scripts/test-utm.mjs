/**
 * Smoke test: UTM capture + mailto decoration on static portfolio shells.
 * Run from portfolio/: node scripts/test-utm.mjs
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

const server = await serve();
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;
const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

try {
  await page.goto(`${base}/?utm_source=linkedin&utm_medium=social`, {
    waitUntil: "load",
  });
  await page.waitForFunction(
    () => {
      const a = document.querySelector('a[href^="mailto:"]');
      return a && a.getAttribute("href")?.includes("subject=");
    },
    { timeout: 8000 }
  );

  const stored = await page.evaluate(() => ({
    source: sessionStorage.getItem("pm_utm_source"),
    medium: sessionStorage.getItem("pm_utm_medium"),
    captured: sessionStorage.getItem("pm_utm_captured_at"),
    landing: sessionStorage.getItem("pm_utm_landing_url"),
    api: typeof window.pmUtm?.getParams === "function" ? window.pmUtm.getParams() : null,
  }));

  if (stored.source !== "linkedin") {
    throw new Error(`expected pm_utm_source=linkedin, got ${stored.source}`);
  }
  if (stored.medium !== "social") {
    throw new Error(`expected pm_utm_medium=social, got ${stored.medium}`);
  }
  if (!stored.captured) {
    throw new Error("pm_utm_captured_at not set");
  }

  const mailtoHref = await page.evaluate(() => {
    const a = document.querySelector('a[href^="mailto:"]');
    return a ? a.getAttribute("href") : null;
  });

  if (!mailtoHref || mailtoHref.indexOf("subject=") === -1) {
    throw new Error(`mailto not decorated with subject: ${mailtoHref}`);
  }

  await page.goto(`${base}/about?utm_source=github`, {
    waitUntil: "domcontentloaded",
  });

  const stillLinkedin = await page.evaluate(() =>
    sessionStorage.getItem("pm_utm_source")
  );
  if (stillLinkedin !== "linkedin") {
    throw new Error("first-touch overwritten on second navigation");
  }

  console.log("utm test ok:", { stored, mailtoSnippet: mailtoHref.slice(0, 120) });
} finally {
  await browser.close();
  server.close();
}
