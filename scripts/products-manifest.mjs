/** Shared slug → product folder map for preview and Vercel routing. */
export const PRODUCTS = {
  "background-remover": { folder: "BackgroundRemover", root: false },
  "canvas-games": { folder: "Canvas-Js-Games", root: true },
  codediff: { folder: "CodeDiff", root: false },
  "coot-parser": { folder: "coot-parser--experimental", root: false },
  "django-learning": { folder: "django-learning-projects", root: false },
  "email-validation": { folder: "Email-Validation", root: false },
  tracktemp: { folder: "ESP8266-DHT11-Google-Sheets-Logger", root: false },
  lambda: { folder: "lambda", root: false },
  lumina: { folder: "lumina", root: false },
  playground: { folder: "piyush-playground", root: false, staticOut: "out" },
  "postman-to-swagger": { folder: "postman-to-swagger", root: false },
  readtime: { folder: "realtime-text-readtime", root: false, apiCatchAll: true },
  "svg-palette": { folder: "SVG-Palette-Processor", root: false },
  talkative: { folder: "talkative", root: false, bundlePath: "bundled-products/talkative" },
  transcribe: { folder: "transcribe", root: false },
  tsukiyomi: { folder: "Tsukiyomi-Platform", root: false },
  "page-speed": { folder: "website-page-speed-report", root: false },
  wingman: { folder: "wingman", root: false },
  xbat: { folder: "XBat", root: false },
};

export const PRODUCT_SLUGS = Object.keys(PRODUCTS);
