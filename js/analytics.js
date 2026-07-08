/* NEXT COWORK — Google Analytics 4 loader */
(function () {
  "use strict";

  /* Replace this with the GA4 Measurement ID, for example: G-ABCD123456 */
  var GA_MEASUREMENT_ID = "G-T2JVBW1JTD";
  var enabled = /^G-[A-Z0-9]+$/.test(GA_MEASUREMENT_ID) && GA_MEASUREMENT_ID !== "G-XXXXXXXXXX";

  window.NCW_ANALYTICS_ENABLED = enabled;
  if (!enabled) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  var script = document.createElement("script");
  script.async = true;
  script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_MEASUREMENT_ID);
  document.head.appendChild(script);

  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID);
})();
