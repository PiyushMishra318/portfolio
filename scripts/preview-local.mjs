/**
 * Local preview: portfolio root at /, each product at /products/<slug>/ from the monorepo.
 * Product serverless / Express APIs are handled locally (see preview-api.mjs).
 * Run: npm run preview:local
 */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { tryHandleApi, PRODUCT_APIS, API_PATHS } from "./preview-api.mjs";
import { PRODUCTS } from "./products-manifest.mjs";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const PORT = Number(process.env.PORT) || 4173;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

function safePath(base, rel) {
  const resolved = normalize(join(base, rel));
  if (!resolved.startsWith(normalize(base))) return null;
  return resolved;
}

function readText(path) {
  const buf = readFile(path);
  return buf ? buf.toString("utf-8") : null;
}

function injectProductBase(html, mountPath) {
  const prefix = mountPath.endsWith("/") ? mountPath : `${mountPath}/`;
  const base = `<base href="${prefix}">`;
  if (/<base\s/i.test(html)) {
    html = html.replace(/<base[^>]*>/i, base);
  } else {
    html = html.replace(/<head(\s[^>]*)?>/i, (m) => `${m}\n  ${base}`);
  }
  const assetPrefix = prefix.slice(0, -1);
  return html.replace(
    /((?:href|src)=["'])\/(styles\.css|theme\.js|app\.js)(["'])/g,
    `$1${assetPrefix}/$2$3`,
  );
}

function serveProductAsset(slug, rest, res, mountPath = `/products/${slug}`) {
  const file = resolveProduct(slug, rest);
  if (!file) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end(`Product not found: ${slug}`);
    return;
  }
  const ext = extname(file);
  if (ext === ".html") {
    const html = readText(file);
    const body = injectProductBase(html, mountPath);
    res.writeHead(200, { "Content-Type": MIME[".html"] });
    res.end(body);
    return;
  }
  const body = readFile(file);
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
  res.end(body);
}

function resolvePortfolio(pathname) {
  const clean = pathname.split("?")[0];
  if (clean === "/") return join(root, "index.html");
  const direct = join(root, clean.replace(/^\//, ""));
  if (existsSync(direct) && statSync(direct).isFile()) return direct;
  if (clean === "/projects") return join(root, "projects.html");
  if (clean === "/about") return join(root, "about.html");
  if (clean === "/contact") return join(root, "contact.html");
  return null;
}

function resolveProduct(slug, rest) {
  const entry = PRODUCTS[slug];
  if (!entry) return null;
  const { folder, root: useRoot, staticOut, bundlePath } = entry;
  const base = join(root, "products", folder);
  const bundledRoot = bundlePath ? join(root, bundlePath) : null;
  const publicDir = staticOut ? join(base, staticOut) : join(base, "public");

  if (slug === "canvas-games") {
    let rel = rest.replace(/^\//, "");
    // Root — serve bundled landing page
    if (!rel || rel === "") {
      const bundledLanding = bundledRoot ? join(bundledRoot, "index.html") : null;
      if (bundledLanding && existsSync(bundledLanding)) return bundledLanding;
      const landing = join(publicDir, "index.html");
      if (existsSync(landing)) return landing;
    }
    // Sub-asset in bundled dir (styles.css, theme.js etc)
    if (bundledRoot) {
      const bundledAsset = safePath(bundledRoot, rel);
      if (bundledAsset && existsSync(bundledAsset) && statSync(bundledAsset).isFile()) return bundledAsset;
    }
    // Resolve path inside the actual game repo
    if (!rel.endsWith(".html") && !extname(rel)) rel = join(rel, "index.html").replace(/\\/g, "/");
    const gameFile = safePath(base, rel);
    if (gameFile && existsSync(gameFile) && statSync(gameFile).isFile()) return gameFile;
    return null;
  }

  const productRoot =
    bundledRoot && existsSync(bundledRoot)
      ? bundledRoot
      : useRoot || (!staticOut && !existsSync(join(base, "public")))
        ? base
        : publicDir;

  let rel = rest.replace(/^\//, "");
  if (!rel || rel.endsWith("/")) rel = (rel || "") + "index.html";
  if (!extname(rel)) {
    const asFile = join(productRoot, rel);
    if (existsSync(asFile) && statSync(asFile).isFile()) rel = rel;
    else rel = join(rel, "index.html").replace(/\\/g, "/");
  }

  const file = safePath(productRoot, rel);
  if (file && existsSync(file) && statSync(file).isFile()) return file;
  const fallback = safePath(productRoot, "index.html");
  if (fallback && existsSync(fallback)) return fallback;
  return null;
}

async function serveProductRoute(slug, rest, req, res, mountPath) {
  if (!PRODUCTS[slug]) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end(`Product not found: ${slug}`);
    return;
  }
  // For canvas-games sub-pages (e.g. /flappy-bird/), the <base> must point at the
  // sub-directory so relative assets (game.js, sprite.js, image/) resolve correctly.
  let effectiveMountPath = mountPath;
  if (slug === "canvas-games" && rest && rest !== "/") {
    const sub = rest.replace(/\/$/, ""); // e.g. "/flappy-bird"
    effectiveMountPath = mountPath + sub; // e.g. "/products/canvas-games/flappy-bird"
  }
  serveProductAsset(slug, rest, res, effectiveMountPath);
}

async function handler(req, res) {
  const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);
  const pathname = decodeURIComponent(url.pathname);

  if (await tryHandleApi(req, res, pathname, url.searchParams, root)) return;

  const bareProduct = pathname.match(/^\/products\/([^/]+)$/);
  if (bareProduct) {
    res.writeHead(301, { Location: `/products/${bareProduct[1]}/` });
    res.end();
    return;
  }

  const bareProject = pathname.match(/^\/project\/([^/]+)$/);
  if (bareProject) {
    res.writeHead(301, { Location: `/project/${bareProject[1]}/` });
    res.end();
    return;
  }

  const projectMatch = pathname.match(/^\/project\/([^/]+)(\/.*)?$/);
  if (projectMatch) {
    await serveProductRoute(
      projectMatch[1],
      projectMatch[2] || "/",
      req,
      res,
      `/project/${projectMatch[1]}`,
    );
    return;
  }

  const productMatch = pathname.match(/^\/products\/([^/]+)(\/.*)?$/);
  if (productMatch) {
    await serveProductRoute(
      productMatch[1],
      productMatch[2] || "/",
      req,
      res,
      `/products/${productMatch[1]}`,
    );
    return;
  }

  const file = resolvePortfolio(pathname);
  if (!file) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
    return;
  }
  const body = readFile(file);
  const headers = { "Content-Type": MIME[extname(file)] || "application/octet-stream" };
  const basename = file.split(/[/\\]/).pop();
  if (basename === "d" || basename === "main.js") {
    headers["Cache-Control"] = "no-store";
  }
  res.writeHead(200, headers);
  res.end(body);
}

function readFile(path) {
  if (!existsSync(path) || !statSync(path).isFile()) return null;
  return readFileSync(path);
}

const server = createServer(handler);
server.listen(PORT, "127.0.0.1", () => {
  console.log(`Portfolio preview: http://127.0.0.1:${PORT}/`);
  console.log(`Products: ${Object.keys(PRODUCTS).map((s) => `/products/${s}/`).join(", ")}`);
  console.log(`Projects: ${Object.keys(PRODUCTS).map((s) => `/project/${s}/`).join(", ")}`);
  console.log(`Preview APIs (${Object.keys(PRODUCT_APIS).length} products):`);
  for (const line of API_PATHS) console.log(`  ${line}`);
});

