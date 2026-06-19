/** Shared slug → product folder map for preview and Vercel routing. */
export const PRODUCTS = {
  "background-remover": { folder: "BackgroundRemover", root: false },
  "canvas-games": { folder: "Canvas-Js-Games", root: true },
  codediff: { folder: "CodeDiff", root: false },
  "coot-parser": {
    folder: "coot-parser--experimental",
    root: false,
    bundlePath: "bundled-products/coot-parser",
    skipClone: true,
  },
  "django-learning": {
    folder: "django-learning-projects",
    root: false,
    bundlePath: "bundled-products/django-learning",
    skipClone: true,
  },
  "email-validation": {
    folder: "Email-Validation",
    root: false,
    bundlePath: "bundled-products/email-validation",
    skipClone: true,
  },
  tracktemp: { folder: "ESP8266-DHT11-Google-Sheets-Logger", root: false },
  lambda: {
    folder: "lambda",
    root: false,
    bundlePath: "bundled-products/lambda",
    skipClone: true,
  },
  lumina: { folder: "lumina", root: false },
  "postman-to-swagger": {
    folder: "postman-to-swagger",
    root: false,
    bundlePath: "bundled-products/postman-to-swagger",
    skipClone: true,
  },
  readtime: {
    folder: "realtime-text-readtime",
    root: false,
    apiCatchAll: true,
    bundlePath: "bundled-products/readtime",
    skipClone: true,
  },
  "svg-palette": {
    folder: "SVG-Palette-Processor",
    root: false,
    bundlePath: "bundled-products/svg-palette",
    skipClone: true,
  },
  talkative: { folder: "talkative", root: false, bundlePath: "bundled-products/talkative" },
  transcribe: { folder: "transcribe", root: false },
  tsukiyomi: {
    folder: "Tsukiyomi-Platform",
    root: false,
    bundlePath: "bundled-products/tsukiyomi",
  },
  "page-speed": {
    folder: "website-page-speed-report",
    root: false,
    bundlePath: "bundled-products/page-speed",
    skipClone: true,
  },
  wingman: { folder: "wingman", root: false },
  xbat: { folder: "XBat", root: false },
};

export const PRODUCT_SLUGS = Object.keys(PRODUCTS);
