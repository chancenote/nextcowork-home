/* NEXT COWORK — interactions (vanilla, no deps) */
(function () {
  "use strict";

  /* Mark JS as active so CSS can hide .reveal only when JS can reveal it.
     If this script fails to load, .reveal stays visible (no blank page). */
  document.documentElement.classList.add("js");

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Lightweight analytics shim. No-op until the GA4 loader has a real Measurement ID. */
  function track(name, params) {
    try {
      if (window.NCW_ANALYTICS_ENABLED && window.gtag) {
        window.gtag("event", name, params || {});
      }
    } catch (e) {}
  }

  /* Copy fallback for browsers without navigator.clipboard */
  function legacyCopy(text) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }

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

  /* Insights feed (generated from content/insights/*.md) */
  var feedRoot = document.getElementById("feed");
  if (feedRoot && window.NCW_FEED) {
    var colors = { insight: "var(--accent)", brunch: "var(--line-public)", naver: "#03C75A", threads: "#1C1C22", notion: "var(--violet)", news: "var(--point)" };
    var names = { insight: "인사이트", brunch: "브런치", naver: "네이버 블로그", threads: "Threads", notion: "노션 자료실", news: "소식" };
    window.NCW_FEED.slice(0, 8).forEach(function (item) {
      var a = document.createElement("a");
      a.className = "feed-item";
      a.href = item.url;
      if (/^https?:\/\//.test(item.url)) {
        a.target = "_blank";
        a.rel = "noopener";
      }
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

  /* Conversion link tracking (no-op until GA4 is enabled) */
  document.querySelectorAll('a[href^="tel:"]').forEach(function (a) {
    a.addEventListener("click", function () { track("tel_click"); });
  });
  document.querySelectorAll('a[href*="open.kakao.com"]').forEach(function (a) {
    a.addEventListener("click", function () { track("kakao_click"); });
  });
  document.querySelectorAll('a[href*="bit.ly/edu_cowork"], a[href*="docs.google.com/forms"]').forEach(function (a) {
    a.addEventListener("click", function () { track("googleform_click"); });
  });

  /* Contact form → fetch endpoint if configured, else mailto. + copy-to-clipboard fallback. */
  var form = document.getElementById("contact-form");
  if (form) {
    var statusEl = document.getElementById("cf-status");
    function setStatus(msg) { if (statusEl) statusEl.textContent = msg; }

    function buildMessage() {
      var d = new FormData(form);
      var service = d.get("service") || "일반";
      var subject = "[웹사이트 문의] " + service + " — " + (d.get("name") || "");
      var body =
        "이름: " + (d.get("name") || "") + "\n" +
        "소속: " + (d.get("org") || "") + "\n" +
        "연락처: " + (d.get("phone") || "") + "\n" +
        "관심 서비스: " + service + "\n\n" +
        (d.get("message") || "");
      return { subject: subject, body: body, service: service };
    }

    form.addEventListener("submit", function (ev) {
      var endpoint = form.getAttribute("data-endpoint");
      var msg = buildMessage();
      track("form_submit", { service: msg.service });

      if (endpoint && endpoint !== "") {
        /* Real POST endpoint configured (Formspree/Make etc.) */
        ev.preventDefault();
        setStatus("전송 중입니다…");
        fetch(endpoint, { method: "POST", body: new FormData(form), headers: { "Accept": "application/json" } })
          .then(function (r) {
            if (!r.ok) throw new Error("bad status");
            form.reset();
            setStatus("문의가 접수되었습니다. 영업일 1일 내 회신드립니다.");
          })
          .catch(function () {
            setStatus("전송에 실패했습니다. 아래 ‘내용 복사’로 복사해 ceo@nextcw.com 으로 보내주세요.");
          });
        return;
      }

      /* mailto fallback */
      ev.preventDefault();
      setStatus("메일 앱을 엽니다. 열리지 않으면 아래 ‘내용 복사’로 복사해 ceo@nextcw.com 으로 보내주세요.");
      location.href =
        "mailto:ceo@nextcw.com?subject=" + encodeURIComponent(msg.subject) + "&body=" + encodeURIComponent(msg.body);
    });

    var copyBtn = document.getElementById("cf-copy");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var msg = buildMessage();
        var text = "받는 사람: ceo@nextcw.com\n제목: " + msg.subject + "\n\n" + msg.body;
        function ok() { setStatus("내용을 복사했습니다. ceo@nextcw.com 으로 붙여넣어 보내주세요."); }
        function fail() { setStatus("복사에 실패했습니다. 직접 ceo@nextcw.com 으로 보내주세요."); }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(ok).catch(function () { legacyCopy(text) ? ok() : fail(); });
        } else {
          legacyCopy(text) ? ok() : fail();
        }
      });
    }
  }
})();
