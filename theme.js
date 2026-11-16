/* Runs before first paint: apply the saved theme, else follow the visitor's system preference. */
(function () {
  try {
    var saved = localStorage.getItem("ohhgood-theme");
    var dark = saved ? saved === "dark" : window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  } catch (e) { /* storage blocked: stay on light */ }
})();
