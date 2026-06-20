/**
 * Homepage featured projects: random trio on load + rotate every ~6.5s.
 * Patches /d fetch so the SPA bootstraps with a random set; uses landscape PNGs
 * for sharp mobile (data-touch) and desktop WebGL (data-src).
 */
(function (global) {
  "use strict";

  var COUNT = 3;
  var INTERVAL_MS = 6500;
  var timer = null;
  var lastSetKey = "";
  var origFetch = global.fetch;

  var PROJECTS = [
    { slug: "lumina", title: "Lumina", desc: "Walkthroughs become tests", tags: "Whisper · Playwright · LangChain · Python", label: "PYTHON · TESTING" },
    { slug: "tsukiyomi", title: "Tsukiyomi", desc: "Your GBA library, moonlit", tags: "Kotlin · Room DB · Material · Emulator hooks", label: "ANDROID · GBA" },
    { slug: "transcribe", title: "Transcribe", desc: "Session recordings to subtitles", tags: "Whisper · FFmpeg · Batch CLI · SRT export", label: "PYTHON · MEDIA" },
    { slug: "talkative", title: "Talkative", desc: "Conversations in one place", tags: "Kotlin · Firebase · Google Sign-In · Material", label: "ANDROID · CHAT" },
    { slug: "wingman", title: "Wingman", desc: "Upgrade everything on Windows", tags: "winget · Chocolatey · npm · pip", label: "WINDOWS · TUI" },
    { slug: "tracktemp", title: "TrackTemp", desc: "DHT11 to Google Sheets", tags: "ESP8266 · DHT11 · PushingBox · Arduino", label: "ESP8266 · IOT" },
    { slug: "codediff", title: "CodeDiff", desc: "Line-by-line file compare", tags: "C++17 · CMake · HTTP API · Diff viewer", label: "C++ · CLI" },
    { slug: "coot-parser", title: "Coot Parser", desc: "Canvas exports to React", tags: "Himalaya AST · React JSX · Composer · Layer split", label: "NODE · DESIGN-TO-CODE" },
    { slug: "lambda", title: "Lambda@Edge", desc: "On-the-fly image pipeline", tags: "Lambda@Edge · Sharp · S3 · CloudFront", label: "AWS · CDN" },
    { slug: "postman-to-swagger", title: "Postman to Swagger", desc: "Collections to OpenAPI 2", tags: "NestJS · TypeScript · Swagger UI · Postman JSON", label: "NESTJS · API" },
    { slug: "readtime", title: "Readtime", desc: "Live reading time estimate", tags: "HTMX · Express · Debounce · Vanilla HTML", label: "HTMX · EXPRESS" },
    { slug: "page-speed", title: "Page Speed", desc: "PageSpeed reports", tags: "NestJS · PSI API · Sitemap crawl · JSON export", label: "NESTJS · PSI" },
    { slug: "email-validation", title: "Email Validation", desc: "Inbound spam verdicts", tags: "SES Lambda · SPF · DKIM · Virus scan", label: "AWS · SES" },
    { slug: "django-learning", title: "Django Learning", desc: "REST API + blog projects", tags: "DRF · JWT · Pygments · Sessions", label: "DJANGO · LEARNING" },
    { slug: "svg-palette", title: "SVG Palette", desc: "Extract & rewrite color palettes", tags: "SVG parse · RGBA normalize · Gradients · CLI", label: "NODE · SVG" },
    { slug: "canvas-games", title: "Canvas Games", desc: "Mini arcade in the browser", tags: "Canvas 2D · High-DPI · Vanilla JS · Arcade physics", label: "HTML5 · CANVAS" },
    { slug: "xbat", title: "XBat", desc: "Xbox battery HUD widget", tags: "Electron · XInput · Glass UI · Tray app", label: "ELECTRON · WINDOWS" },
    { slug: "background-remover", title: "BackgroundRemover", desc: "Foreground masks from video", tags: "OpenCV · MOG2 · KNN · VideoCapture", label: "OPENCV · C++" }
  ];

  function imagePaths(slug) {
    return {
      landscape: "./product-" + slug + "-landscape.png",
      resized: "./product-" + slug + "-resized.png",
    };
  }

  function isTouchLayout() {
    var root = global.document && global.document.documentElement;
    return root && (root.classList.contains("phone") || root.classList.contains("tablet"));
  }

  function isDesktopLayout() {
    var root = global.document && global.document.documentElement;
    return root && root.classList.contains("desktop");
  }

  function pickRandom(count, avoidKey) {
    var pool = PROJECTS.slice();
    var picked = [];
    while (picked.length < count && pool.length) {
      var idx = Math.floor(Math.random() * pool.length);
      picked.push(pool.splice(idx, 1)[0]);
    }
    var key = picked.map(function (p) { return p.slug; }).sort().join(",");
    if (avoidKey && key === avoidKey && PROJECTS.length > count) {
      return pickRandom(count, "");
    }
    return picked;
  }

  function featuredInnerHtml(projects) {
    var titles = projects.map(function (p) {
      return (
        '<div class="home_featured_title_all_c"><p class="home_featured_nbr">Featured Project</p>' +
        '<p class="home_featured_title"><span>' + p.title + "</span></p></div>"
      );
    }).join("");

    var cards = projects.map(function (p, i) {
      var paths = imagePaths(p.slug);
      var cls = i === 0 ? " home_featued_project_1" : i === projects.length - 1 ? " project_last" : "";
      return (
        '<div class="home_featured_project' + cls + '"><a href="/project/' + p.slug + '/">' +
        '<figure class="home_featured_img"><div class="img_overlay"></div>' +
        '<img class="home_featured_img_media lazy" data-lazy="data-lazy" src="/blank.png" data-src="' +
        paths.landscape + '" data-touch="' + paths.landscape + '" alt="' + p.title + '"/></figure>' +
        '<div class="home_featured_text"><div class="home_featured_description"><p>' +
        p.title + "<br>" + p.desc + '</p></div><div class="home_featured_labels"><p>' +
        p.tags + "<br>" + p.label + "</p></div></div></a></div>"
      );
    }).join("");

    return titles + '<div class="featRef"></div>' + cards;
  }

  function patchHomeHtml(html, projects) {
    var marker = '<div class="home_featured_c">';
    var start = html.indexOf(marker);
    if (start === -1) return html;
    var innerStart = start + marker.length;
    var end = html.indexOf('</div></div><section class="home_capabilities"', innerStart);
    if (end === -1) return html;
    return html.slice(0, innerStart) + featuredInnerHtml(projects) + html.slice(end);
  }

  function patchPortfolioData(data) {
    if (!data || !data.pages || !data.pages["/"]) return data;
    var picked = pickRandom(COUNT, "");
    lastSetKey = picked.map(function (p) { return p.slug; }).sort().join(",");
    data.pages["/"].html = patchHomeHtml(data.pages["/"].html, picked);
    return data;
  }

  function loadTextureEntry(url) {
    return new Promise(function (resolve, reject) {
      if (global.TEXTURES && global.TEXTURES[url]) {
        resolve(global.TEXTURES[url]);
        return;
      }
      var template = global.TEXTURES &&
        Object.keys(global.TEXTURES).map(function (k) { return global.TEXTURES[k]; }).find(function (e) {
          return e && e[0] && typeof e[0].clone === "function";
        });
      if (!template) {
        reject(new Error("texture unavailable"));
        return;
      }
      var img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = function () {
        var tex = template[0].clone();
        tex.image = img;
        tex.needsUpdate = true;
        var entry = [tex, img.naturalWidth, img.naturalHeight, img];
        global.TEXTURES[url] = entry;
        resolve(entry);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  function updateWebGLFeatured(projects) {
    var store = global.__portfolioApp && global.__portfolioApp.canvas &&
      global.__portfolioApp.canvas.home && global.__portfolioApp.canvas.home.store;
    if (!store || !store.length) return;

    store.forEach(function (item, i) {
      var project = projects[i];
      if (!project || !item.el || !item.material || !item.material.uniforms) return;
      var url = imagePaths(project.slug).landscape;
      item.el.setAttribute("data-src", url);
      item.el.setAttribute("data-touch", url);
      loadTextureEntry(url).then(function (entry) {
        item.material.uniforms.tex.value = entry[0];
        if (item.material.uniforms.ns && item.material.uniforms.ns.value) {
          item.material.uniforms.ns.value.x = entry[1];
          item.material.uniforms.ns.value.y = entry[2];
        }
        if (typeof item.cb === "function") item.cb();
      }).catch(function () {});
    });
  }

  function applyTouchImage(img, src) {
    if (!img || !src) return;
    img.setAttribute("data-touch", src);
    if (isTouchLayout()) img.src = src;
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
        img.setAttribute("data-src", paths.landscape);
        img.setAttribute("alt", project.title);
        applyTouchImage(img, paths.landscape);
        if (!isTouchLayout()) img.src = "/blank.png";
      }

      var desc = cards[i].querySelector(".home_featured_description p");
      if (desc) desc.innerHTML = project.title + "<br>" + project.desc;

      var labels = cards[i].querySelector(".home_featured_labels p");
      if (labels) labels.innerHTML = project.tags + "<br>" + project.label;
    });

    lastSetKey = projects.map(function (p) { return p.slug; }).sort().join(",");

    if (isDesktopLayout()) updateWebGLFeatured(projects);
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
    scheduleTouchRefresh(root);
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

    if (app.querySelector(".home_featured")) onFeaturedSection(app);

    global.addEventListener("popstate", function () {
      if (!app.querySelector(".home_featured")) stopTimer();
    });
  }

  if (origFetch) {
    global.fetch = function () {
      return origFetch.apply(this, arguments).then(function (res) {
        var url = String(arguments[0] && arguments[0].url ? arguments[0].url : arguments[0]);
        if (url.indexOf("/d") === -1) return res;
        return res.clone().json().then(function (data) {
          patchPortfolioData(data);
          return new Response(JSON.stringify(data), {
            status: res.status,
            statusText: res.statusText,
            headers: { "Content-Type": "application/json" },
          });
        });
      });
    };
  }

  if (global.document) {
    if (global.document.body) observeApp();
    else global.document.addEventListener("DOMContentLoaded", observeApp);
  }
})(typeof window !== "undefined" ? window : this);
