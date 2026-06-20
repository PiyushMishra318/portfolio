/**
 * Homepage featured projects: random trio on load + rotate every ~6s.
 * Uses landscape PNGs on touch (data-touch) for sharp mobile screenshots.
 */
(function (global) {
  "use strict";

  var COUNT = 3;
  var INTERVAL_MS = 6000;
  var timer = null;
  var lastSetKey = "";

  var PROJECTS = [
    {
      slug: "lumina",
      title: "Lumina",
      desc: "Walkthroughs become tests",
      tags: "Whisper · Playwright · LangChain · Python",
      label: "PYTHON · TESTING",
    },
    {
      slug: "tsukiyomi",
      title: "Tsukiyomi",
      desc: "Your GBA library, moonlit",
      tags: "Kotlin · Room DB · Material · Emulator hooks",
      label: "ANDROID · GBA",
    },
    {
      slug: "transcribe",
      title: "Transcribe",
      desc: "Session recordings to subtitles",
      tags: "Whisper · FFmpeg · Batch CLI · SRT export",
      label: "PYTHON · MEDIA",
    },
    {
      slug: "talkative",
      title: "Talkative",
      desc: "Conversations in one place",
      tags: "Kotlin · Firebase · Google Sign-In · Material",
      label: "ANDROID · CHAT",
    },
    {
      slug: "wingman",
      title: "Wingman",
      desc: "Upgrade everything on Windows",
      tags: "winget · Chocolatey · npm · pip",
      label: "WINDOWS · TUI",
    },
    {
      slug: "tracktemp",
      title: "TrackTemp",
      desc: "DHT11 to Google Sheets",
      tags: "ESP8266 · DHT11 · PushingBox · Arduino",
      label: "ESP8266 · IOT",
    },
    {
      slug: "codediff",
      title: "CodeDiff",
      desc: "Line-by-line file compare",
      tags: "C++17 · CMake · HTTP API · Diff viewer",
      label: "C++ · CLI",
    },
    {
      slug: "coot-parser",
      title: "Coot Parser",
      desc: "Canvas exports to React",
      tags: "Himalaya AST · React JSX · Composer · Layer split",
      label: "NODE · DESIGN-TO-CODE",
    },
    {
      slug: "lambda",
      title: "Lambda@Edge",
      desc: "On-the-fly image pipeline",
      tags: "Lambda@Edge · Sharp · S3 · CloudFront",
      label: "AWS · CDN",
    },
    {
      slug: "postman-to-swagger",
      title: "Postman to Swagger",
      desc: "Collections to OpenAPI 2",
      tags: "NestJS · TypeScript · Swagger UI · Postman JSON",
      label: "NESTJS · API",
    },
    {
      slug: "readtime",
      title: "Readtime",
      desc: "Live reading time estimate",
      tags: "HTMX · Express · Debounce · Vanilla HTML",
      label: "HTMX · EXPRESS",
    },
    {
      slug: "page-speed",
      title: "Page Speed",
      desc: "PageSpeed reports",
      tags: "NestJS · PSI API · Sitemap crawl · JSON export",
      label: "NESTJS · PSI",
    },
    {
      slug: "email-validation",
      title: "Email Validation",
      desc: "Inbound spam verdicts",
      tags: "SES Lambda · SPF · DKIM · Virus scan",
      label: "AWS · SES",
    },
    {
      slug: "django-learning",
      title: "Django Learning",
      desc: "REST API + blog projects",
      tags: "DRF · JWT · Pygments · Sessions",
      label: "DJANGO · LEARNING",
    },
    {
      slug: "svg-palette",
      title: "SVG Palette",
      desc: "Extract & rewrite color palettes",
      tags: "SVG parse · RGBA normalize · Gradients · CLI",
      label: "NODE · SVG",
    },
    {
      slug: "canvas-games",
      title: "Canvas Games",
      desc: "Mini arcade in the browser",
      tags: "Canvas 2D · High-DPI · Vanilla JS · Arcade physics",
      label: "HTML5 · CANVAS",
    },
    {
      slug: "xbat",
      title: "XBat",
      desc: "Xbox battery HUD widget",
      tags: "Electron · XInput · Glass UI · Tray app",
      label: "ELECTRON · WINDOWS",
    },
    {
      slug: "background-remover",
      title: "BackgroundRemover",
      desc: "Foreground masks from video",
      tags: "OpenCV · MOG2 · KNN · VideoCapture",
      label: "OPENCV · C++",
    },
  ];

  function isTouchLayout() {
    var root = global.document && global.document.documentElement;
    return root && (root.classList.contains("phone") || root.classList.contains("tablet"));
  }

  function imagePaths(slug) {
    return {
      landscape: "./product-" + slug + "-landscape.png",
      resized: "./product-" + slug + "-resized.png",
    };
  }

  function pickRandom(count, avoidKey) {
    var pool = PROJECTS.slice();
    var picked = [];
    while (picked.length < count && pool.length) {
      var idx = Math.floor(Math.random() * pool.length);
      picked.push(pool.splice(idx, 1)[0]);
    }
    var key = picked
      .map(function (p) {
        return p.slug;
      })
      .sort()
      .join(",");
    if (avoidKey && key === avoidKey && PROJECTS.length > count) {
      return pickRandom(count, "");
    }
    return picked;
  }

  function applyTouchImage(img, src) {
    if (!img || !src) return;
    img.setAttribute("data-touch", src);
    if (isTouchLayout()) {
      img.src = src;
    }
  }

  function applyFeaturedSet(projects, root) {
    var titles = root.querySelectorAll(".home_featured_title_all_c");
    var cards = root.querySelectorAll(".home_featured_project");

    projects.forEach(function (project, i) {
      var paths = imagePaths(project.slug);
      var href = "/project/" + project.slug + "/";

      if (titles[i]) {
        var titleSpan = titles[i].querySelector(".home_featured_title span");
        if (titleSpan) titleSpan.textContent = project.title;
      }

      if (!cards[i]) return;

      var link = cards[i].querySelector("a");
      if (link) link.setAttribute("href", href);

      var img = cards[i].querySelector(".home_featured_img_media");
      if (img) {
        img.setAttribute("data-src", paths.resized);
        img.setAttribute("alt", project.title);
        applyTouchImage(img, paths.landscape);
        if (!isTouchLayout()) {
          img.src = "/blank.png";
        }
      }

      var desc = cards[i].querySelector(".home_featured_description p");
      if (desc) {
        desc.innerHTML = project.title + "<br>" + project.desc;
      }

      var labels = cards[i].querySelector(".home_featured_labels p");
      if (labels) {
        labels.innerHTML = project.tags + "<br>" + project.label;
      }
    });

    lastSetKey = projects
      .map(function (p) {
        return p.slug;
      })
      .sort()
      .join(",");

    scheduleTouchRefresh(root);
  }

  function scheduleTouchRefresh(root) {
    if (!isTouchLayout()) return;
    var refresh = function () {
      root.querySelectorAll(".home_featured_img_media").forEach(function (img) {
        var touch = img.getAttribute("data-touch");
        if (touch) img.src = touch;
      });
    };
    refresh();
    setTimeout(refresh, 0);
    setTimeout(refresh, 50);
    setTimeout(refresh, 300);
  }

  function rotateFeatured(root) {
    applyFeaturedSet(pickRandom(COUNT, lastSetKey), root);
  }

  function stopTimer() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function startTimer(root) {
    stopTimer();
    timer = setInterval(function () {
      if (!root.isConnected) {
        stopTimer();
        return;
      }
      rotateFeatured(root);
    }, INTERVAL_MS);
  }

  function initFeatured(root) {
    if (!root || root.getAttribute("data-featured-rotate") === "1") return;
    root.setAttribute("data-featured-rotate", "1");
    rotateFeatured(root);
    startTimer(root);
  }

  function onFeaturedSection(node) {
    var section = node.classList && node.classList.contains("home_featured")
      ? node
      : node.querySelector && node.querySelector(".home_featured");
    if (!section) return;
    initFeatured(section);
  }

  function observeApp() {
    var app = global.document.getElementById("app");
    if (!app) return;

    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          onFeaturedSection(node);
        });
      });
    });

    observer.observe(app, { childList: true, subtree: true });

    if (app.querySelector(".home_featured")) {
      onFeaturedSection(app);
    }

    global.addEventListener("popstate", function () {
      var featured = app.querySelector(".home_featured");
      if (!featured) stopTimer();
    });
  }

  if (global.document) {
    if (global.document.body) {
      observeApp();
    } else {
      global.document.addEventListener("DOMContentLoaded", observeApp);
    }
  }
})(typeof window !== "undefined" ? window : this);
