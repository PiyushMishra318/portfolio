/**
 * Viewport breakpoint classes for the SPA (html.phone | html.tablet | html.desktop).
 * Must run before main.js — steBg() uses classList.remove() which returns undefined
 * in modern browsers, so its `remove("desktop") && add("tablet")` chain never adds tablet.
 */
(function () {
  var root = document.documentElement;
  var PHONE_MAX = 767;
  var TABLET_MAX = 1023;
  var resizeTimer;

  function applyViewportClass() {
    /* Shorter edge keeps phone layout in landscape on narrow devices */
    var w = Math.min(window.innerWidth, window.innerHeight);
    root.classList.remove("desktop", "tablet", "phone");
    if (w <= PHONE_MAX) {
      root.classList.add("phone");
    } else if (w <= TABLET_MAX) {
      root.classList.add("tablet");
    } else {
      root.classList.add("desktop");
    }
  }

  applyViewportClass();

  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(applyViewportClass, 150);
  });

  window.addEventListener("orientationchange", function () {
    setTimeout(applyViewportClass, 200);
  });
})();
