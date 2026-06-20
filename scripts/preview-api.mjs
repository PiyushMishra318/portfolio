/**
 * Local API routing for product demos (mirrors Vercel rewrites in product vercel.json).
 */
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
let portfolioRoot = join(__dirname, "..");
const requireFromRoot = createRequire(import.meta.url);

/** slug → { folder, routes } — used by preview-local.mjs */
export const PRODUCT_APIS = {
  codediff: {
    folder: "CodeDiff",
    routes: [{ method: "POST", match: "exact", path: "/api/compare", handler: "compare" }],
  },
  "email-validation": {
    folder: "Email-Validation",
    routes: [{ method: "POST", match: "exact", path: "/api/validate", handler: "validate" }],
  },
  lambda: {
    folder: "lambda",
    routes: [{ method: "POST", match: "exact", path: "/api/simulate", handler: "simulate" }],
  },
  "postman-to-swagger": {
    folder: "postman-to-swagger",
    routes: [
      { method: "POST", match: "exact", path: "/convert", handler: "convert" },
      { method: "OPTIONS", match: "exact", path: "/convert", handler: "convert" },
    ],
  },
  readtime: {
    folder: "realtime-text-readtime",
    routes: [{ method: "POST", match: "exact", path: "/readtime", handler: "readtime" }],
  },
  "coot-parser": {
    folder: "coot-parser--experimental",
    routes: [{ match: "prefix", path: "/", handler: "cootParser" }],
  },
  "page-speed": {
    folder: "website-page-speed-report",
    routes: [{ method: "GET", match: "exact", path: "/api/pagespeed", handler: "pagespeed" }],
  },
};

const COOT_PARSER_PREFIXES = ["/api", "/health", "/parse/", "/compose", "/split", "/fixtures/"];

/** @param {string} productFolder */
function productRequire(productFolder) {
  return createRequire(join(portfolioRoot, "products", productFolder, "package.json"));
}

function productDir(slug) {
  const folder = PRODUCT_APIS[slug]?.folder;
  return folder ? join(portfolioRoot, "products", folder) : null;
}

function withProductCwd(slug, fn) {
  const dir = productDir(slug);
  if (!dir) throw new Error(`Unknown product: ${slug}`);
  const prev = process.cwd();
  try {
    process.chdir(dir);
    return fn();
  } finally {
    process.chdir(prev);
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf-8");
      if (!raw) return resolve(undefined);
      const ct = req.headers["content-type"] || "";
      if (ct.includes("application/json")) {
        try {
          resolve(JSON.parse(raw));
        } catch {
          resolve(undefined);
        }
      } else if (ct.includes("application/x-www-form-urlencoded")) {
        resolve(Object.fromEntries(new URLSearchParams(raw)));
      } else {
        resolve(raw);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, data, extraHeaders = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...extraHeaders,
  });
  res.end(JSON.stringify(data));
}

function createVercelRes(res) {
  let statusCode = 200;
  /** @type {Record<string, string>} */
  const headers = {};
  return {
    status(code) {
      statusCode = code;
      return this;
    },
    setHeader(key, value) {
      headers[key] = value;
      return this;
    },
    json(data) {
      sendJson(res, statusCode, data, headers);
    },
    end(data) {
      res.writeHead(statusCode, headers);
      res.end(data);
    },
  };
}

async function invokeCjsHandler(relPath, req, res) {
  const abs = join(portfolioRoot, relPath);
  const mod = requireFromRoot(abs);
  const handler = mod.default ?? mod;
  const body = await readBody(req);
  const url = new URL(req.url || "/", "http://127.0.0.1");
  await handler(
    { method: req.method, body, query: Object.fromEntries(url.searchParams), headers: req.headers },
    createVercelRes(res),
  );
}

function shouldBounce(receipt) {
  for (const key of ["spfVerdict", "dkimVerdict", "spamVerdict", "virusVerdict"]) {
    if (receipt[key]?.status === "FAIL") return true;
  }
  return false;
}

function buildBounceParams(messageId, receipt, emailDomain) {
  return {
    OriginalMessageId: messageId,
    BounceSender: `mailer-daemon@${emailDomain}`,
    MessageDsn: {
      ReportingMta: `dns; ${emailDomain}`,
      ArrivalDate: new Date().toISOString(),
    },
    BouncedRecipientInfoList: (receipt.recipients ?? []).map((recipient) => ({
      Recipient: recipient,
      BounceType: "ContentRejected",
    })),
  };
}

async function handleValidate(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "POST JSON receipt or full SES event" });
    return;
  }
  const body = (await readBody(req)) ?? {};
  const emailDomain = body.emailDomain || process.env.EMAIL_DOMAIN || "example.com";

  let receipt;
  let messageId;
  if (body.Records?.[0]?.ses) {
    const ses = body.Records[0].ses;
    receipt = ses.receipt;
    messageId = ses.mail.messageId;
  } else {
    receipt = body.receipt ?? body;
    messageId = body.messageId ?? "demo-message-id";
  }

  const bounce = shouldBounce(receipt);
  const disposition = bounce ? "stop_rule_set" : "accept";
  const bounceParams = bounce ? buildBounceParams(messageId, receipt, emailDomain) : null;

  sendJson(res, 200, {
    mode: "simulation",
    disposition,
    bounce,
    bounceParams,
    note: bounce
      ? "Production Lambda would call ses:SendBounce via boto3"
      : "Message would be accepted by the rule set",
  });
}

async function handleCompare(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "POST JSON { left, right }" });
    return;
  }
  const body = (await readBody(req)) ?? {};
  const { compareTexts, computeLineDiff } = withProductCwd("codediff", () =>
    productRequire("CodeDiff")("./lib/lineDiff.js"),
  );
  const left = typeof body.left === "string" ? body.left : "";
  const right = typeof body.right === "string" ? body.right : "";
  const { equal, elapsedMs } = compareTexts(left, right);
  const diff = computeLineDiff(left, right);
  sendJson(res, 200, {
    equal,
    result: equal ? 1 : 0,
    elapsedMs: Math.round(elapsedMs * 100) / 100,
    diff,
  });
}

function normalizePostmanUrl(url) {
  if (!url) return url;
  // Convert string URL to object form that postman-2-swagger expects
  const raw = typeof url === "string" ? url : (url.raw || "");
  const base = typeof url === "object" ? url : {};
  if (!base.host || !base.path) {
    try {
      const parsed = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
      return {
        ...base,
        raw,
        host: base.host?.length ? base.host : parsed.hostname.split("."),
        path: base.path?.length ? base.path : parsed.pathname.replace(/^\//, "").split("/").filter(Boolean),
        protocol: base.protocol || parsed.protocol.replace(":", ""),
        port: base.port || parsed.port || undefined,
      };
    } catch {}
  }
  return url;
}

function normalizePostmanCollection(col) {
  if (!col || !Array.isArray(col.item)) return col;
  function normalizeItems(items) {
    return items.map((item) => {
      if (item.item) return { ...item, item: normalizeItems(item.item) };
      if (item.request?.url) {
        return { ...item, request: { ...item.request, url: normalizePostmanUrl(item.request.url) } };
      }
      return item;
    });
  }
  return { ...col, item: normalizeItems(col.item) };
}

async function handleConvert(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }
  const body = (await readBody(req)) ?? {};
  if (!body || typeof body !== "object") {
    sendJson(res, 400, { error: "Postman collection must be a JSON object" });
    return;
  }
  try {
    const normalized = normalizePostmanCollection(body);
    const convert = withProductCwd("postman-to-swagger", () => {
      const mod = productRequire("postman-to-swagger")("postman-2-swagger");
      return mod.default ?? mod;
    });
    sendJson(res, 200, convert(normalized));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Conversion failed";
    if (msg.includes("Cannot find module")) {
      sendJson(res, 503, {
        error: "postman-2-swagger not installed — run npm install in products/postman-to-swagger",
      });
    } else {
      sendJson(res, 400, { error: msg });
    }
  }
}

async function handlePagespeed(req, res, searchParams) {
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Use GET with ?url=" });
    return;
  }
  const target = searchParams.get("url")?.trim();
  if (!target) {
    sendJson(res, 400, { error: "Query parameter url is required" });
    return;
  }

  const apiKey = process.env.PAGESPEED_KEY;
  try {
    const result = await withProductCwd("page-speed", async () => {
      const axios = productRequire("website-page-speed-report")("axios");
      const { getMetrics, getOpportunities } = productRequire("website-page-speed-report")(
        "./dist/src/pagespeed/lighthouse.js",
      );
      async function runPagespeed(url, strategy) {
        const params = { url, strategy };
        if (apiKey) params.key = apiKey;
        const response = await axios.get(
          "https://www.googleapis.com/pagespeedonline/v5/runPagespeed",
          { params },
        );
        const lighthouse = response.data.lighthouseResult;
        return {
          score: lighthouse.categories.performance.score * 100,
          stats: getMetrics(lighthouse),
          opportunities: getOpportunities(lighthouse.audits),
        };
      }
      const [desktop, mobile] = await Promise.all([
        runPagespeed(target, "desktop"),
        runPagespeed(target, "mobile"),
      ]);
      return { url: target, desktop, mobile };
    });
    sendJson(res, 200, result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "PageSpeed request failed";
    sendJson(res, 502, { error: msg });
  }
}

async function handleReadtime(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "POST only" });
    return;
  }
  const body = (await readBody(req)) ?? {};
  const text = body.text ?? "";
  const label = withProductCwd("readtime", () => {
    const { readTimeForText } = productRequire("realtime-text-readtime")("./lib/formatReadTime.js");
    return readTimeForText(text.trim() === "" ? " " : text);
  });
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(`<p class="stats">${label}</p>`);
}

/** @type {Map<string, import('express').Application>} */
const expressApps = new Map();

function delegateToExpress(slug, apiPath, nodeReq, nodeRes, searchParams) {
  return withProductCwd(slug, () => {
    const key = PRODUCT_APIS[slug].folder;
    if (!expressApps.has(key)) {
      const reqProd = productRequire(key);
      const rel = slug === "coot-parser" ? "./src/server.js" : "./server.js";
      expressApps.set(key, reqProd(rel));
    }
    const app = expressApps.get(key);
    const query = searchParams.toString();
    nodeReq.url = apiPath + (query ? `?${query}` : "");
    return new Promise((resolve) => {
      const done = () => resolve(true);
      nodeRes.on("finish", done);
      nodeRes.on("close", done);
      app(nodeReq, nodeRes);
    });
  });
}

const HANDLERS = {
  validate: handleValidate,
  simulate: (req, res) => invokeCjsHandler("products/lambda/api/simulate.js", req, res),
  compare: handleCompare,
  convert: handleConvert,
  pagespeed: handlePagespeed,
  readtime: handleReadtime,
};

function routeMatches(route, method, path) {
  if (route.method && route.method !== method) return false;
  if (route.match === "exact") return path === route.path;
  return false;
}

function isCootParserPath(path) {
  return COOT_PARSER_PREFIXES.some(
    (p) => path === p.replace(/\/$/, "") || path.startsWith(p),
  );
}

function resolveSlugPath(pathname) {
  const m = pathname.match(/^\/products\/([^/]+)(\/.*)?$/);
  if (!m) return { slug: null, apiPath: pathname };
  const slug = m[1];
  if (!PRODUCT_APIS[slug]) return { slug: null, apiPath: pathname };
  return { slug, apiPath: m[2] || "/" };
}

function findHandler(slug, apiPath, method) {
  if (slug === "coot-parser" && (apiPath === "/" || isCootParserPath(apiPath))) {
    return { slug, handler: "cootParser", apiPath };
  }
  const cfg = PRODUCT_APIS[slug];
  if (!cfg) return null;
  for (const route of cfg.routes) {
    if (route.handler === "cootParser") continue;
    if (routeMatches(route, method, apiPath)) {
      return { slug, handler: route.handler, apiPath };
    }
  }
  return null;
}

function findGlobalHandler(pathname, method) {
  for (const [slug, cfg] of Object.entries(PRODUCT_APIS)) {
    for (const route of cfg.routes) {
      if (route.handler === "cootParser") continue;
      if (routeMatches(route, method, pathname)) {
        return { slug, handler: route.handler, apiPath: pathname };
      }
    }
  }
  if (isCootParserPath(pathname)) {
    return { slug: "coot-parser", handler: "cootParser", apiPath: pathname };
  }
  return null;
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {string} pathname
 * @param {URLSearchParams} [searchParams]
 * @param {string} [root]
 * @returns {Promise<boolean>} true if handled
 */
export async function tryHandleApi(req, res, pathname, searchParams = new URLSearchParams(), root) {
  if (root) portfolioRoot = root;

  const { slug: pathSlug, apiPath: scopedPath } = resolveSlugPath(pathname);
  let match = pathSlug ? findHandler(pathSlug, scopedPath, req.method || "GET") : null;
  if (!match) match = findGlobalHandler(pathname, req.method || "GET");
  if (!match) return false;

  try {
    if (match.handler === "cootParser") {
      await delegateToExpress(match.slug, match.apiPath, req, res, searchParams);
      return true;
    }
    const fn = HANDLERS[match.handler];
    if (!fn) {
      sendJson(res, 501, { error: `No preview handler: ${match.handler}` });
      return true;
    }
    if (match.handler === "pagespeed") {
      await fn(req, res, searchParams);
    } else {
      await fn(req, res);
    }
    return true;
  } catch (err) {
    console.error(`[preview-api] ${match.slug}/${match.handler}:`, err);
    if (!res.headersSent) {
      sendJson(res, 500, { error: err instanceof Error ? err.message : "API handler failed" });
    }
    return true;
  }
}

export const API_PATHS = [
  "POST /api/validate (email-validation)",
  "POST /products/email-validation/api/validate",
  "POST /api/simulate (lambda)",
  "POST /api/compare (codediff)",
  "GET /api/pagespeed?url= (page-speed, mock without PAGESPEED_KEY)",
  "POST /convert (postman-to-swagger)",
  "POST /readtime (readtime)",
  "GET|POST /parse/*, /compose, /split, /health, /fixtures/* (coot-parser)",
  "Same routes under /products/<slug>/…",
];
