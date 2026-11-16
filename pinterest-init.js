/* Pinterest Tag base code for Ohhgood! (no enhanced match / no visitor email data). */
"use strict";
(function () {
  if (typeof window.pintrk === "function") return;

  window.pintrk = function () {
    window.pintrk.queue.push(Array.prototype.slice.call(arguments));
  };
  window.pintrk.queue = [];
  window.pintrk.version = "3.0";

  var script = document.createElement("script");
  script.async = true;
  script.src = "https://s.pinimg.com/ct/core.js";
  var first = document.getElementsByTagName("script")[0];
  if (first && first.parentNode) first.parentNode.insertBefore(script, first);
  else document.head.appendChild(script);

  window.pintrk("load", "2613721244798");
  window.pintrk("page");
})();
