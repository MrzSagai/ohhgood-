/* Pinterest Tag interaction tracking for Ohhgood! */
"use strict";
(function () {
  function isAmazonDestination(href) {
    try {
      const url = new URL(href, window.location.href);
      return url.protocol === "https:" &&
        (url.hostname === "amazon.com" || url.hostname.endsWith(".amazon.com") ||
         url.hostname === "amzn.to");
    } catch (_) {
      return false;
    }
  }

  document.addEventListener("click", function (event) {
    const link = event.target && event.target.closest
      ? event.target.closest("a[href]")
      : null;
    if (!link || !isAmazonDestination(link.href)) return;
    if (typeof window.pintrk === "function") {
      window.pintrk("track", "AmazonOutboundClick");
    }
  }, true);
})();
