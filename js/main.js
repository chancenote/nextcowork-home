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

  /* Submenu (has-sub) aria-expanded reflects open state on hover/focus */
  document.querySelectorAll(".has-sub").forEach(function (li) {
    var trigger = li.querySelector("a");
    if (!trigger) return;
    trigger.setAttribute("aria-haspopup", "true");
    trigger.setAttribute("aria-expanded", "false");
    function set(open) { trigger.setAttribute("aria-expanded", open ? "true" : "false"); }
    li.addEventListener("mouseenter", function () { set(true); });
    li.addEventListener("mouseleave", function () { set(false); });
    li.addEventListener("focusin", function () { set(true); });
    li.addEventListener("focusout", function () { set(false); });
  });

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
    /* Safety fallback: force-reveal anything still hidden after 3.5s so
       no-scroll renderers (screenshots, crawlers) and fast/anchor jumps
       never leave content blank. Adding .in to already-shown els is a no-op. */
    window.setTimeout(function () {
      revealEls.forEach(function (el) { el.classList.add("in"); });
    }, 3500);
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

  function searchParam(name) {
    try { return new URLSearchParams(window.location.search).get(name) || ""; } catch (e) { return ""; }
  }

  function setFieldValue(id, value) {
    var el = document.getElementById(id);
    if (el) el.value = value || "";
  }

  function serviceKeyFromSelect(select) {
    if (!select) return "";
    var opt = select.options[select.selectedIndex];
    return opt ? (opt.getAttribute("data-s") || "") : "";
  }

  var sParam = searchParam("s");
  var tParam = searchParam("t");
  var ctaParam = searchParam("cta");
  var currentPath = window.location.pathname || "/";
  var inferredSourcePath = currentPath;
  try {
    if (document.referrer) {
      var refUrl = new URL(document.referrer);
      if (refUrl.origin === window.location.origin) inferredSourcePath = refUrl.pathname || currentPath;
    }
  } catch (e) {}

  var crumbLabels = {
    flexoffice: "FlexOffice 컨설팅 문의",
    "ai-campus": "AI Campus 교육 문의",
    "public": "Public Advisory 문의",
    coaching: "CEO AI 코칭 문의",
    general: "프로젝트 문의"
  };

  var tierOptions = {
    general: [
      ["", "선택 안 함"],
      ["diagnosis", "무료 사전진단"],
      ["partnership", "협업/제휴 문의"],
      ["other", "기타 문의"]
    ],
    flexoffice: [
      ["precheck", "무료 사전 진단"],
      ["diagnosis", "① 도입 타당성 진단"],
      ["design", "② 컨셉·운영모델 설계"],
      ["pf", "③ PF 사업계획서 포함"],
      ["retainer", "④ 전 주기 동행"]
    ],
    "ai-campus": [
      ["diagnosis", "무료 교육 진단"],
      ["lecture", "AI 실무활용 특강"],
      ["workshop", "실무 워크샵"],
      ["campus", "사내 AI 캠퍼스 구축"],
      ["sprint", "8주 파일럿 (업무 전환)"],
      ["proposal", "교육 제안요청"]
    ],
    "public": [
      ["advisory", "자문·교육 문의"],
      ["space", "공유공간 건립 자문"],
      ["ai", "공공조직 AI 역량강화 교육"],
      ["mentoring", "창업 심사·멘토링"],
      ["dev", "개발사업 협업 검토 (건설사·시행사·디벨로퍼)"]
    ],
    coaching: [
      ["founding", "CEO AI 코칭 (4석 한정 할인)"],
      ["consult", "10분 무료 상담"],
      ["team", "임원·리더 팀 패키지"]
    ]
  };

  function updateTierOptions(serviceKey, selectedTier) {
    var tierSelect = document.getElementById("cf-tier");
    if (!tierSelect) return;
    var options = tierOptions[serviceKey] || tierOptions.general;
    tierSelect.innerHTML = "";
    options.forEach(function (item) {
      var opt = document.createElement("option");
      opt.value = item[1];
      opt.setAttribute("data-t", item[0]);
      opt.textContent = item[1];
      tierSelect.appendChild(opt);
    });
    if (selectedTier) {
      var target = tierSelect.querySelector('option[data-t="' + selectedTier + '"]');
      if (target) tierSelect.value = target.value;
    }
  }

  function readContext(extra) {
    var svcSelect = document.getElementById("cf-service");
    var tierSelect = document.getElementById("cf-tier");
    var serviceKey = serviceKeyFromSelect(svcSelect) || sParam || "general";
    var tierOpt = tierSelect && tierSelect.options[tierSelect.selectedIndex];
    var params = {
      service: svcSelect ? svcSelect.value : serviceKey,
      service_key: serviceKey,
      tier: tierSelect ? tierSelect.value : "",
      tier_key: tierOpt ? (tierOpt.getAttribute("data-t") || "") : tParam,
      source_page: document.getElementById("cf-source-page") ? document.getElementById("cf-source-page").value : currentPath,
      cta_location: document.getElementById("cf-cta-location") ? document.getElementById("cf-cta-location").value : ctaParam,
      utm_source: searchParam("utm_source"),
      utm_medium: searchParam("utm_medium"),
      utm_campaign: searchParam("utm_campaign")
    };
    if (extra) {
      Object.keys(extra).forEach(function (key) { params[key] = extra[key]; });
    }
    return params;
  }

  function fillContactContext() {
    var crumbEl = document.getElementById("contact-crumb");
    if (crumbEl && crumbLabels[sParam]) crumbEl.textContent = crumbLabels[sParam];

    var svcSelect = document.getElementById("cf-service");
    if (svcSelect && sParam) {
      var preOpt = svcSelect.querySelector('option[data-s="' + sParam + '"]');
      if (preOpt) svcSelect.value = preOpt.value;
    }

    var serviceKey = serviceKeyFromSelect(svcSelect) || sParam || "general";
    updateTierOptions(serviceKey, tParam);

    setFieldValue("cf-source-page", searchParam("source_page") || inferredSourcePath);
    setFieldValue("cf-cta-location", ctaParam || "direct");
    setFieldValue("cf-landing-page", window.location.href);
    setFieldValue("cf-referrer", document.referrer || "");
    setFieldValue("cf-utm-source", searchParam("utm_source"));
    setFieldValue("cf-utm-medium", searchParam("utm_medium"));
    setFieldValue("cf-utm-campaign", searchParam("utm_campaign"));

    var message = document.getElementById("cf-message");
    if (message && !message.value && serviceKey !== "general") {
      var selectedTier = document.getElementById("cf-tier") ? document.getElementById("cf-tier").value : "";
      message.placeholder = selectedTier ?
        selectedTier + " 관련 문의입니다. 대상·규모·희망 일정 등을 자유롭게 남겨주세요." :
        "대상·규모·희망 일정 등을 자유롭게 남겨주세요.";
    }

    if (svcSelect && svcSelect.getAttribute("data-context-bound") !== "true") {
      svcSelect.setAttribute("data-context-bound", "true");
      svcSelect.addEventListener("change", function () {
        updateTierOptions(serviceKeyFromSelect(svcSelect) || "general", "");
      });
    }
  }
  fillContactContext();

  /* Conversion link tracking (no-op until GA4 is enabled) */
  document.querySelectorAll('a[href^="tel:"]').forEach(function (a) {
    a.addEventListener("click", function () { track("tel_click", { source_page: currentPath }); });
  });
  document.querySelectorAll('a[href*="open.kakao.com"]').forEach(function (a) {
    a.addEventListener("click", function () { track("kakao_click", { source_page: currentPath }); });
  });
  document.querySelectorAll('a[href*="bit.ly/edu_cowork"], a[href*="docs.google.com/forms"]').forEach(function (a) {
    a.addEventListener("click", function () { track("googleform_click", { source_page: currentPath }); });
  });
  document.querySelectorAll('a[href^="/contact/"]').forEach(function (a) {
    a.addEventListener("click", function () {
      var url;
      try { url = new URL(a.getAttribute("href"), window.location.origin); } catch (e) { url = null; }
      track("service_cta_click", {
        source_page: currentPath,
        service_key: url ? (url.searchParams.get("s") || "general") : "general",
        tier_key: url ? (url.searchParams.get("t") || "") : "",
        cta_location: url ? (url.searchParams.get("cta") || "") : ""
      });
    });
  });

  /* Contact form → fetch endpoint if configured, else mailto. + copy-to-clipboard fallback. */
  var form = document.getElementById("contact-form");
  if (form) {
    var statusEl = document.getElementById("cf-status");
    var formStarted = false;
    function setStatus(msg) { if (statusEl) statusEl.textContent = msg; }

    form.addEventListener("input", function () {
      if (formStarted) return;
      formStarted = true;
      track("form_start", readContext());
    });

    function buildMessage() {
      var d = new FormData(form);
      var service = d.get("service") || "일반";
      var tier = d.get("tier") || "선택 안 함";
      var subject = "[웹사이트 문의] " + service + " / " + tier + " — " + (d.get("name") || "");
      var body =
        "이름: " + (d.get("name") || "") + "\n" +
        "소속: " + (d.get("org") || "") + "\n" +
        "이메일: " + (d.get("email") || "") + "\n" +
        "전화번호: " + (d.get("phone") || "") + "\n" +
        "기관/조직 유형: " + (d.get("org_type") || "") + "\n" +
        "관심 서비스: " + service + "\n" +
        "세부 관심 상품: " + tier + "\n" +
        "예상 예산: " + (d.get("budget") || "") + "\n" +
        "희망 일정: " + (d.get("timeline") || "") + "\n" +
        "개인정보 동의: " + (d.get("privacy_agree") || "") + "\n\n" +
        "문의 내용:\n" + (d.get("message") || "") + "\n\n" +
        "---\n" +
        "source_page: " + (d.get("source_page") || "") + "\n" +
        "cta_location: " + (d.get("cta_location") || "") + "\n" +
        "landing_page: " + (d.get("landing_page") || "") + "\n" +
        "referrer: " + (d.get("referrer") || "") + "\n" +
        "utm_source: " + (d.get("utm_source") || "") + "\n" +
        "utm_medium: " + (d.get("utm_medium") || "") + "\n" +
        "utm_campaign: " + (d.get("utm_campaign") || "");
      return { subject: subject, body: body, service: service, tier: tier };
    }

    form.addEventListener("submit", function (ev) {
      var endpoint = form.getAttribute("data-endpoint");
      var msg = buildMessage();
      var params = readContext({ endpoint_type: endpoint ? "post_endpoint" : "mailto" });
      track("form_submit_attempt", params);
      track("form_submit", params);

      if (endpoint && endpoint !== "") {
        /* Real POST endpoint configured (Formspree/Make etc.) */
        ev.preventDefault();
        setStatus("전송 중입니다...");
        fetch(endpoint, { method: "POST", body: new FormData(form), headers: { "Accept": "application/json" } })
          .then(function (r) {
            if (!r.ok) throw new Error("bad status");
            track("generate_lead", readContext({ endpoint_type: "post_endpoint" }));
            track("form_submit_success", readContext({ endpoint_type: "post_endpoint" }));
            form.reset();
            fillContactContext();
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

  /* Newsletter form → fetch endpoint (no navigation). Falls back to form action if JS-less. */
  var news = document.getElementById("newsletter-form");
  if (news) {
    var newsStatus = document.getElementById("newsletter-status");
    news.addEventListener("submit", function (ev) {
      var endpoint = news.getAttribute("data-endpoint") || news.getAttribute("action");
      if (!endpoint) return;
      ev.preventDefault();
      if (newsStatus) newsStatus.textContent = "구독 신청 중입니다...";
      track("newsletter_submit", { source_page: currentPath });
      fetch(endpoint, { method: "POST", body: new FormData(news), headers: { "Accept": "application/json" } })
        .then(function (r) {
          if (!r.ok) throw new Error("bad status");
          track("generate_lead", { source_page: currentPath, form_type: "newsletter" });
          news.reset();
          if (newsStatus) newsStatus.textContent = "구독 신청이 접수되었습니다. 감사합니다.";
        })
        .catch(function () {
          if (newsStatus) newsStatus.textContent = "신청에 실패했습니다. 카카오톡 채널로 신청해주세요.";
        });
    });
  }
})();
