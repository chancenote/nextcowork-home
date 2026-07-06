/* NEXT COWORK — interactions (vanilla, no deps) */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Nav scroll shadow */
  var nav = document.querySelector(".nav");
  function onScroll() {
    if (nav) nav.classList.toggle("scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* Mobile menu */
  var burger = document.querySelector(".nav-burger");
  var menu = document.querySelector(".nav-menu");
  if (burger && menu) {
    burger.addEventListener("click", function () {
      var open = menu.classList.toggle("open");
      burger.classList.toggle("open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        menu.classList.remove("open");
        burger.classList.remove("open");
      });
    });
  }

  /* Reveal on scroll */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduced) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* Count-up numbers: <span data-count="106" data-suffix="+"> */
  function animateCount(el) {
    var target = parseInt(el.getAttribute("data-count"), 10) || 0;
    var suffix = el.getAttribute("data-suffix") || "";
    var dur = 1400;
    var start = null;
    function frame(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = Math.round(target * eased);
      el.textContent = val.toLocaleString();
      if (p < 1) {
        requestAnimationFrame(frame);
      } else if (suffix) {
        el.innerHTML = target.toLocaleString() + '<span class="plus">' + suffix + "</span>";
      }
    }
    requestAnimationFrame(frame);
  }
  var counters = document.querySelectorAll("[data-count]");
  if (counters.length) {
    if ("IntersectionObserver" in window && !reduced) {
      var cio = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) {
              animateCount(e.target);
              cio.unobserve(e.target);
            }
          });
        },
        { threshold: 0.4 }
      );
      counters.forEach(function (el) { cio.observe(el); });
    } else {
      counters.forEach(function (el) {
        var t = parseInt(el.getAttribute("data-count"), 10) || 0;
        var s = el.getAttribute("data-suffix") || "";
        el.innerHTML = t.toLocaleString() + (s ? '<span class="plus">' + s + "</span>" : "");
      });
    }
  }

  /* Insights feed (edit js/insights-data.js to publish) */
  var feedRoot = document.getElementById("feed");
  if (feedRoot && window.NCW_FEED) {
    var colors = { brunch: "var(--line-public)", naver: "#03C75A", threads: "#1C1C22", notion: "var(--violet)", news: "var(--point)" };
    var names = { brunch: "브런치", naver: "네이버 블로그", threads: "Threads", notion: "노션 자료실", news: "소식" };
    window.NCW_FEED.slice(0, 8).forEach(function (item) {
      var a = document.createElement("a");
      a.className = "feed-item";
      a.href = item.url;
      a.target = "_blank";
      a.rel = "noopener";
      a.style.setProperty("--fc", colors[item.src] || "#6955BA");
      a.innerHTML =
        '<span class="feed-src">' + (names[item.src] || item.src) + "</span>" +
        "<h4>" + item.title + "</h4>" +
        '<span class="date">' + (item.date || "") + "</span>";
      feedRoot.appendChild(a);
    });
  }

  /* Contact: contextualize from ?s= service param (set by service page CTAs) */
  var sParam = null;
  try { sParam = new URLSearchParams(window.location.search).get("s"); } catch (e) { sParam = null; }
  if (sParam) {
    var crumbLabels = {
      flexoffice: "FlexOffice 컨설팅 문의",
      "ai-campus": "AI Campus 교육 문의",
      "public": "Public Advisory 문의",
      coaching: "CEO AI 코칭 문의"
    };
    var crumbEl = document.getElementById("contact-crumb");
    if (crumbEl && crumbLabels[sParam]) crumbEl.textContent = crumbLabels[sParam];
    var svcSelect = document.getElementById("cf-service");
    if (svcSelect) {
      var preOpt = svcSelect.querySelector('option[data-s="' + sParam + '"]');
      if (preOpt) svcSelect.value = preOpt.value;
    }
  }

  /* Contact form → mailto fallback (until Formspree/Make endpoint is set) */
  var form = document.getElementById("contact-form");
  if (form) {
    form.addEventListener("submit", function (ev) {
      var endpoint = form.getAttribute("data-endpoint");
      if (endpoint && endpoint !== "") return; // real POST endpoint configured
      ev.preventDefault();
      var d = new FormData(form);
      var subject = "[웹사이트 문의] " + (d.get("service") || "일반") + " — " + (d.get("name") || "");
      var body =
        "이름: " + (d.get("name") || "") + "\n" +
        "소속: " + (d.get("org") || "") + "\n" +
        "연락처: " + (d.get("phone") || "") + "\n" +
        "관심 서비스: " + (d.get("service") || "") + "\n\n" +
        (d.get("message") || "");
      location.href =
        "mailto:ceo@nextcw.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    });
  }
})();
