/**
 * Portfolio UTM capture (first-touch attribution).
 *
 * - Reads utm_source, utm_medium, utm_campaign, utm_term, utm_content from the query string on load.
 * - First-touch: writes sessionStorage keys pm_utm_* only once per tab session (later UTM links are ignored).
 * - Persists across in-session SPA route changes (sessionStorage; no main.js edits).
 * - Decorates mailto: links with subject/body attribution when UTMs are stored.
 * - Exposes window.pmUtm for optional analytics hooks (no GA in repo today).
 */
(function (global) {
  "use strict";

  var STORAGE_PREFIX = "pm_utm_";
  var PARAMS = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
  ];
  var CAPTURED_AT_KEY = STORAGE_PREFIX + "captured_at";
  var LANDING_KEY = STORAGE_PREFIX + "landing_url";
  var APPLIED_ATTR = "data-pm-utm-applied";

  function storageKey(param) {
    return STORAGE_PREFIX + param.slice(4);
  }

  function parseQuery(search) {
    var out = {};
    var qs = search || "";
    if (qs.charAt(0) === "?") qs = qs.slice(1);
    if (!qs) return out;
    qs.split("&").forEach(function (pair) {
      if (!pair) return;
      var i = pair.indexOf("=");
      var rawKey = i === -1 ? pair : pair.slice(0, i);
      var rawVal = i === -1 ? "" : pair.slice(i + 1);
      var key = decodeURIComponent(rawKey.replace(/\+/g, " "));
      var val = decodeURIComponent(rawVal.replace(/\+/g, " "));
      if (PARAMS.indexOf(key) !== -1 && val) out[key] = val;
    });
    return out;
  }

  function getParams() {
    var out = {};
    if (!global.sessionStorage) return out;
    PARAMS.forEach(function (p) {
      var v = global.sessionStorage.getItem(storageKey(p));
      if (v) out[p] = v;
    });
    return out;
  }

  function hasCaptured() {
    try {
      return !!global.sessionStorage.getItem(CAPTURED_AT_KEY);
    } catch (e) {
      return false;
    }
  }

  function captureFromUrl() {
    if (!global.sessionStorage || !global.location) return;
    if (hasCaptured()) return;

    var fromUrl = parseQuery(global.location.search);
    var keys = Object.keys(fromUrl);
    if (!keys.length) return;

    keys.forEach(function (p) {
      global.sessionStorage.setItem(storageKey(p), fromUrl[p]);
    });
    global.sessionStorage.setItem(CAPTURED_AT_KEY, new Date().toISOString());
    global.sessionStorage.setItem(
      LANDING_KEY,
      global.location.href.split("#")[0]
    );
  }

  function getQueryString() {
    var parts = [];
    var params = getParams();
    PARAMS.forEach(function (p) {
      if (params[p]) {
        parts.push(
          encodeURIComponent(p) + "=" + encodeURIComponent(params[p])
        );
      }
    });
    return parts.join("&");
  }

  function buildAttributionBlock() {
    var params = getParams();
    var keys = Object.keys(params);
    if (!keys.length) return "";

    var lines = ["", "---", "Portfolio attribution (first touch):"];
    PARAMS.forEach(function (p) {
      if (params[p]) lines.push(p + ": " + params[p]);
    });
    try {
      var landing = global.sessionStorage.getItem(LANDING_KEY);
      var captured = global.sessionStorage.getItem(CAPTURED_AT_KEY);
      if (landing) lines.push("landing: " + landing);
      if (captured) lines.push("captured: " + captured);
    } catch (e) {
      /* ignore */
    }
    return lines.join("\n");
  }

  function parseMailtoQuery(qs) {
    var out = { subject: "", body: "" };
    if (!qs) return out;
    qs.split("&").forEach(function (pair) {
      if (!pair) return;
      var i = pair.indexOf("=");
      var key = decodeURIComponent(
        (i === -1 ? pair : pair.slice(0, i)).replace(/\+/g, " ")
      ).toLowerCase();
      var val = decodeURIComponent(
        (i === -1 ? "" : pair.slice(i + 1)).replace(/\+/g, " ")
      );
      if (key === "subject") out.subject = val;
      if (key === "body") out.body = val;
    });
    return out;
  }

  function encodeMailtoQuery(fields) {
    var parts = [];
    if (fields.subject) {
      parts.push("subject=" + encodeURIComponent(fields.subject));
    }
    if (fields.body) {
      parts.push("body=" + encodeURIComponent(fields.body));
    }
    return parts.join("&");
  }

  function decorateMailto(href) {
    if (!href || href.indexOf("mailto:") !== 0) return href;

    var params = getParams();
    if (!Object.keys(params).length) return href;

    var qIndex = href.indexOf("?");
    var address = qIndex === -1 ? href.slice(7) : href.slice(7, qIndex);
    var existing = parseMailtoQuery(qIndex === -1 ? "" : href.slice(qIndex + 1));

    var source = params.utm_source || "portfolio";
    var subjectBase = existing.subject || "Portfolio inquiry";
    var subject =
      subjectBase.indexOf("via ") !== -1
        ? subjectBase
        : subjectBase + " (via " + source + ")";

    var attribution = buildAttributionBlock();
    var body = existing.body;
    if (attribution && body.indexOf("Portfolio attribution") === -1) {
      body = body ? body + attribution : attribution.replace(/^\n/, "");
    } else if (attribution && !body) {
      body = attribution.replace(/^\n/, "");
    }

    var query = encodeMailtoQuery({ subject: subject, body: body });
    return "mailto:" + address + (query ? "?" + query : "");
  }

  function applyToAnchor(anchor) {
    if (!anchor) return;
    var href = anchor.getAttribute("href");
    if (!href || href.indexOf("mailto:") !== 0) return;
    if (!Object.keys(getParams()).length) return;

    var next = decorateMailto(href);
    if (next !== href) anchor.setAttribute("href", next);
    anchor.setAttribute(APPLIED_ATTR, "true");
  }

  function applyToDocument(root) {
    var scope = root || global.document;
    if (!scope || !scope.querySelectorAll) return;
    scope.querySelectorAll('a[href^="mailto:"]').forEach(applyToAnchor);
  }

  function watchDom() {
    if (!global.document || !global.MutationObserver) return;
    var observer = new global.MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          if (node.matches && node.matches('a[href^="mailto:"]')) {
            applyToAnchor(node);
          }
          if (node.querySelectorAll) applyToDocument(node);
        });
      });
    });
    observer.observe(global.document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href"],
    });
  }

  function onRouteChange() {
    applyToDocument();
  }

  function onLoad() {
    applyToDocument();
  }

  captureFromUrl();

  function boot() {
    applyToDocument();
    watchDom();
  }

  if (global.document) {
    if (global.document.body) {
      boot();
    } else {
      global.document.addEventListener("DOMContentLoaded", boot);
    }
    global.addEventListener("popstate", onRouteChange);
    global.addEventListener("hashchange", onRouteChange);
    global.addEventListener("load", onLoad);
  }

  global.pmUtm = {
    PARAMS: PARAMS,
    STORAGE_PREFIX: STORAGE_PREFIX,
    captureFromUrl: captureFromUrl,
    getParams: getParams,
    getQueryString: getQueryString,
    decorateMailto: decorateMailto,
    applyToDocument: applyToDocument,
    hasCaptured: hasCaptured,
  };
})(typeof window !== "undefined" ? window : this);
