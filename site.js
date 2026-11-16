/* Behaviour shared by every page: theme toggle, mobile menu, footer year. */
"use strict";
(function () {
  var root = document.documentElement;
  function syncToggle() {
    var dark = root.dataset.theme === "dark";
    document.querySelectorAll(".theme-toggle").forEach(function (button) {
      button.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
      button.setAttribute("aria-pressed", String(dark));
      button.textContent = dark ? "Light mode" : "Dark mode";
    });
  }
  function init() {
    syncToggle();
    document.querySelectorAll(".theme-toggle").forEach(function (button) {
      button.addEventListener("click", function () {
        var next = root.dataset.theme === "dark" ? "light" : "dark";
        root.dataset.theme = next;
        try { localStorage.setItem("ohhgood-theme", next); } catch (e) { /* ignore */ }
        syncToggle();
      });
    });
    var menu = document.querySelector(".menu-toggle");
    var nav = document.getElementById("mobile-nav");
    if (menu && nav) {
      var setOpen = function (open) {
        nav.hidden = !open;
        menu.setAttribute("aria-expanded", String(open));
        menu.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      };
      menu.addEventListener("click", function () { setOpen(nav.hidden); });
      nav.addEventListener("click", function (event) { if (event.target.closest("a")) setOpen(false); });
      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !nav.hidden) { setOpen(false); menu.focus(); }
      });
    }
    var year = document.getElementById("year");
    if (year) year.textContent = String(new Date().getFullYear());
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
