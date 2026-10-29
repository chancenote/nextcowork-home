/* Apply preloaded fonts without making their stylesheet block first paint.
   Kept external so the site's script-src policy needs no inline handlers. */
(function () {
  "use strict";
  var fonts = document.querySelector('link[data-font-styles]');
  if (fonts) fonts.rel = "stylesheet";
})();
