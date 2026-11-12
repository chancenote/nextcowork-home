/* NEXT COWORK — interactions (vanilla, no deps) */
(function () {
  "use strict";

  /* Mark JS as active so CSS can hide .reveal only when JS can reveal it.
     If this script fails to load, .reveal stays visible (no blank page). */
  document.documentElement.classList.add("js");

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* 스팸 방어: 페이지를 연 뒤 제출까지 걸린 시간(ms)과 숨김 입력칸(company_url). 판정은 서버(Make)가 한다. */
  var pageLoadedAt = Date.now();
  function markElapsed(f) {
    var el = f.querySelector('input[name="form_elapsed_ms"]');
    if (el) el.value = String(Date.now() - pageLoadedAt);
  }
  function honeypotFilled(f) {
    var hp = f.querySelector('input[name="company_url"]');
    return !!(hp && hp.value);
  }

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
    var setMenu = function (open) {
      menu.classList.toggle("open", open);
      burger.classList.toggle("open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
    };
    burger.addEventListener("click", function () {
      var open = !menu.classList.contains("open");
      setMenu(open);
      // The button follows the menu in DOM order, so move keyboard focus into the menu.
      if (open) { var first = menu.querySelector("a"); if (first) first.focus(); }
    });
    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { setMenu(false); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("open")) { setMenu(false); burger.focus(); }
    });
  }

  /* Submenu (has-sub) aria-expanded reflects open state on hover/focus */
  document.querySelectorAll(".has-sub").forEach(function (li) {
    var trigger = li.querySelector("a");
    if (!trigger) return;
    trigger.setAttribute("aria-haspopup", "true");
    trigger.setAttribute("aria-expanded", "false");
    var sub = li.querySelector(".sub");
    /* Escape hides the hover/focus panel; the panel's own CSS (:hover/:focus-within) takes over again on the next pointer or focus move. */
    function dismiss(on) {
      if (!sub) return;
      sub.style.visibility = on ? "hidden" : "";
      sub.style.opacity = on ? "0" : "";
    }
    function set(open) { trigger.setAttribute("aria-expanded", open ? "true" : "false"); }
    li.addEventListener("mouseenter", function () { dismiss(false); set(true); });
    li.addEventListener("mouseleave", function () { dismiss(false); set(false); });
    li.addEventListener("focusin", function (e) {
      if (e.target === trigger && li.hasAttribute("data-dismissed")) return; // stay closed after Escape returns focus here
      li.removeAttribute("data-dismissed"); dismiss(false); set(true);
    });
    li.addEventListener("focusout", function (e) { if (!li.contains(e.relatedTarget)) { li.removeAttribute("data-dismissed"); dismiss(false); set(false); } });
    li.addEventListener("keydown", function (e) {
      if (e.key !== "Escape" || trigger.getAttribute("aria-expanded") !== "true") return;
      if (burger && menu && menu.classList.contains("open")) return; // mobile menu handles its own Escape
      e.stopPropagation();
      li.setAttribute("data-dismissed", "true");
      dismiss(true); set(false); trigger.focus();
    });
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

  /* Insights feed (generated from content/insights/*.md)
     빌드가 insights/index.html의 FEED:START/END 사이에 같은 마크업을 정적으로 써 둔다.
     여기는 폴백 전용 — 이미 정적 항목이 있으면 렌더하지 않는다(중복 방지).
     색상·라벨 맵을 고치면 scripts/build-insights.mjs의 feedColors/feedNames도 함께 고칠 것. */
  var feedRoot = document.getElementById("feed");
  if (feedRoot && !feedRoot.classList.contains("thumbnail-feed") && window.NCW_FEED && !feedRoot.firstElementChild) {
    var colors = {
      insight: { line: "var(--accent)", ink: "var(--accent-ink)" },
      brunch: { line: "var(--line-public)", ink: "var(--line-public-ink)" },
      naver: { line: "#03C75A", ink: "var(--naver-ink)" },
      threads: { line: "#1C1C22", ink: "#1C1C22" },
      notion: { line: "var(--violet)", ink: "var(--line-ai-ink)" },
      news: { line: "var(--point)", ink: "var(--point-action)" }
    };
    var names = { insight: "인사이트", brunch: "브런치", naver: "네이버 블로그", threads: "Threads", notion: "노션 자료실", news: "소식" };
    window.NCW_FEED.slice(0, 8).forEach(function (item) {
      var a = document.createElement("a");
      a.className = "feed-item";
      a.href = item.url;
      if (/^https?:\/\//.test(item.url)) {
        a.target = "_blank";
        a.rel = "noopener";
      }
      var feedColor = colors[item.src] || colors.insight;
      a.style.setProperty("--fc", feedColor.line);
      a.style.setProperty("--fc-ink", feedColor.ink);
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
    /* 오퍼 랜딩(/go/…)은 서비스를 숨김 값으로 고정한다 — select가 아니면 data-s를 그대로 읽는다. */
    if (!select.options) return select.getAttribute("data-s") || "";
    var opt = select.options[select.selectedIndex];
    return opt ? (opt.getAttribute("data-s") || "") : "";
  }

  var sParam = searchParam("s");
  var tParam = searchParam("t");
  /* 오퍼 랜딩의 전용 폼은 form[data-landing]으로 표시한다. 값은 랜딩 주소의 마지막 마디(예: ai-lecture). */
  var landingForm = document.querySelector("form[data-landing]");
  var landingKey = landingForm ? (landingForm.getAttribute("data-landing") || "") : "";
  var ctaParam = searchParam("cta");
  var currentPath = window.location.pathname || "/";
  var inferredSourcePath = currentPath;
  try {
    if (document.referrer) {
      var refUrl = new URL(document.referrer);
      if (refUrl.origin === window.location.origin) inferredSourcePath = refUrl.pathname || currentPath;
    }
  } catch (e) {}

  /* 유입 정보 — 문의가 어느 채널·어느 글에서 왔는지 Make·Notion까지 넘긴다(이름·연락처는 넣지 않는다).
     · URL에 utm_source가 있으면 그 값이 이 탭 세션의 유입이 된다(새 채널이 이전 값을 덮는다).
     · UTM 없이 외부 사이트에서 들어오면 이전 유입을 지운다 — 오래된 카카오 방문이 다른 채널 유입으로 남지 않게.
     · 같은 사이트 안 이동은 유입을 유지한다(글 읽기 → 문의). 원글은 마지막으로 읽은 인사이트 글 slug. */
  var ATTR_KEY = "ncw_attr";
  var ARTICLE_KEY = "ncw_last_article";
  var TRACKING_VERSION = "kakao_cta_v2";
  var UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"];
  function sessionGet(key) {
    try { return JSON.parse(window.sessionStorage.getItem(key) || "null"); } catch (e) { return null; }
  }
  function sessionSet(key, value) {
    try {
      if (value === null) window.sessionStorage.removeItem(key);
      else window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  }
  var urlAttr = null;
  if (searchParam("utm_source")) {
    urlAttr = {};
    UTM_KEYS.forEach(function (key) { urlAttr[key] = searchParam(key); });
    sessionSet(ATTR_KEY, urlAttr);
    sessionSet(ARTICLE_KEY, null);
  } else if (document.referrer) {
    try {
      if (new URL(document.referrer).origin !== window.location.origin) {
        sessionSet(ATTR_KEY, null);
        sessionSet(ARTICLE_KEY, null);
      }
    } catch (e) {}
  }
  var sessionAttr = urlAttr || sessionGet(ATTR_KEY) || {};
  var articleMatch = currentPath.match(/^\/insights\/([a-z0-9-]+)\/$/);
  if (articleMatch) sessionSet(ARTICLE_KEY, articleMatch[1]);
  function attrValue(key) { return sessionAttr[key] || ""; }
  function originArticleSlug() {
    var fromReferrer = inferredSourcePath.match(/^\/insights\/([a-z0-9-]+)\/$/);
    if (fromReferrer) return fromReferrer[1];
    if (urlAttr && ctaParam === "kakao_share" && urlAttr.utm_campaign) return urlAttr.utm_campaign;
    return sessionGet(ARTICLE_KEY) || "";
  }

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
      ["sprint", "사내 AI 캠퍼스 — 한 팀 8주 파일럿으로 시작"],
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
      ["founding", "CEO AI 코칭 (2h×5회)"],
      ["consult", "10분 무료 상담"],
      ["team", "임원·리더 팀 패키지"]
    ]
  };

  function updateTierOptions(serviceKey, selectedTier) {
    var tierSelect = document.getElementById("cf-tier");
    if (!tierSelect || !tierSelect.options) return;
    var options = tierOptions[serviceKey] || tierOptions.general;
    tierSelect.innerHTML = "";
    options.forEach(function (item) {
      var opt = document.createElement("option");
      opt.value = item[1];
      opt.setAttribute("data-t", item[0]);
      opt.textContent = item[1];
      tierSelect.appendChild(opt);
    });
    /* Query parameters are values, never CSS selectors. Unknown keys keep the default. */
    Array.prototype.forEach.call(tierSelect.options, function (option) {
      if (selectedTier && option.getAttribute("data-t") === selectedTier) tierSelect.value = option.value;
    });
  }

  function updateContactLabels() {
    var serviceKey = serviceKeyFromSelect(document.getElementById("cf-service")) || "general";
    var crumbEl = document.getElementById("contact-crumb");
    if (crumbEl) crumbEl.textContent = crumbLabels[serviceKey] || crumbLabels.general;
    var message = document.getElementById("cf-message");
    var tierSelect = document.getElementById("cf-tier");
    var selectedTier = tierSelect ? tierSelect.value : "";
    /* 서비스 페이지에서 넘어온 경우 무엇을 문의하는지 폼 위에 한 줄로 보여준다(값은 아래 선택 칸과 같다). */
    var contextEl = document.getElementById("cf-context");
    var contextText = document.getElementById("cf-context-text");
    var svcSelect = document.getElementById("cf-service");
    if (contextEl && contextText && svcSelect) {
      var svcLabel = svcSelect.options[svcSelect.selectedIndex] ? svcSelect.options[svcSelect.selectedIndex].textContent : "";
      contextText.textContent = svcLabel + (selectedTier && selectedTier !== "선택 안 함" ? " · " + selectedTier : "");
      contextEl.hidden = serviceKey === "general";
    }
    if (message && !landingKey) message.placeholder = serviceKey !== "general" && selectedTier ?
      selectedTier + " 관련 문의입니다. 대상·규모·희망 일정 등을 자유롭게 남겨주세요." :
      "대상·규모·희망 일정 등을 자유롭게 남겨주세요.";
  }

  function readContext(extra) {
    var svcSelect = document.getElementById("cf-service");
    var tierSelect = document.getElementById("cf-tier");
    var serviceKey = serviceKeyFromSelect(svcSelect) || sParam || "general";
    var tierOpt = tierSelect && tierSelect.options && tierSelect.options[tierSelect.selectedIndex];
    var params = {
      service: svcSelect ? svcSelect.value : serviceKey,
      service_key: serviceKey,
      tier: tierSelect ? tierSelect.value : "",
      tier_key: tierOpt ? (tierOpt.getAttribute("data-t") || "") : ((tierSelect && tierSelect.getAttribute("data-t")) || tParam),
      source_page: document.getElementById("cf-source-page") ? document.getElementById("cf-source-page").value : currentPath,
      cta_location: document.getElementById("cf-cta-location") ? document.getElementById("cf-cta-location").value : ctaParam,
      utm_source: attrValue("utm_source"),
      utm_medium: attrValue("utm_medium"),
      utm_campaign: attrValue("utm_campaign"),
      utm_content: attrValue("utm_content"),
      origin_article_slug: originArticleSlug()
    };
    if (landingKey) params.landing = landingKey;
    if (extra) {
      Object.keys(extra).forEach(function (key) { params[key] = extra[key]; });
    }
    return params;
  }

  function fillContactContext() {
    var svcSelect = document.getElementById("cf-service");
    if (svcSelect && svcSelect.options && sParam) {
      Array.prototype.forEach.call(svcSelect.options, function (option) {
        if (option.getAttribute("data-s") === sParam) svcSelect.value = option.value;
      });
    }

    var serviceKey = serviceKeyFromSelect(svcSelect) || sParam || "general";
    updateTierOptions(serviceKey, tParam);

    /* 랜딩 폼은 어느 랜딩에서 접수됐는지가 기준이다 — 직전 페이지가 아니라 랜딩 주소를 남긴다. */
    setFieldValue("cf-source-page", landingKey ? currentPath : (searchParam("source_page") || inferredSourcePath));
    setFieldValue("cf-cta-location", ctaParam || (landingKey ? "landing_form" : "direct"));
    setFieldValue("cf-landing-page", window.location.href);
    setFieldValue("cf-referrer", document.referrer || "");
    setFieldValue("cf-utm-source", attrValue("utm_source"));
    setFieldValue("cf-utm-medium", attrValue("utm_medium"));
    setFieldValue("cf-utm-campaign", attrValue("utm_campaign"));
    setFieldValue("cf-utm-content", attrValue("utm_content"));
    setFieldValue("cf-origin-article", originArticleSlug());
    setFieldValue("cf-tracking-version", TRACKING_VERSION);

    updateContactLabels();

    if (svcSelect && svcSelect.options && svcSelect.getAttribute("data-context-bound") !== "true") {
      svcSelect.setAttribute("data-context-bound", "true");
      svcSelect.addEventListener("change", function () {
        updateTierOptions(serviceKeyFromSelect(svcSelect) || "general", "");
        updateContactLabels();
      });
      var tierSelect = document.getElementById("cf-tier");
      if (tierSelect) tierSelect.addEventListener("change", updateContactLabels);
      var changeBtn = document.getElementById("cf-context-change");
      if (changeBtn) changeBtn.addEventListener("click", function () {
        svcSelect.focus();
        try { svcSelect.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" }); } catch (e) {}
      });
    }
  }
  fillContactContext();

  /* 오퍼 랜딩: 같은 페이지의 전용 폼으로 내려가는 버튼도 기존 service_cta_click으로 센다(이벤트 이름은 그대로, landing 값만 추가).
     하단 고정 버튼은 첫 화면 버튼과 폼이 보이는 동안 숨긴다. */
  if (landingKey) {
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a[data-landing-cta]");
      if (!a) return;
      track("service_cta_click", {
        source_page: currentPath,
        service_key: landingForm.getAttribute("data-service-key") || "general",
        tier_key: landingForm.getAttribute("data-tier-key") || "",
        cta_location: "landing_" + (a.getAttribute("data-landing-cta") || "cta"),
        landing: landingKey
      });
    });
    var stickyBar = document.getElementById("lp-sticky");
    var heroCta = document.getElementById("lp-hero-cta");
    var applySection = document.getElementById("apply");
    if (stickyBar && "IntersectionObserver" in window) {
      var stickyState = { hero: true, apply: false };
      var stickyObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.target === heroCta) stickyState.hero = entry.isIntersecting;
          if (entry.target === applySection) stickyState.apply = entry.isIntersecting;
        });
        stickyBar.classList.toggle("is-hidden", stickyState.hero || stickyState.apply);
      }, { threshold: 0 });
      if (heroCta) stickyObserver.observe(heroCta); else stickyState.hero = false;
      if (applySection) stickyObserver.observe(applySection);
    } else if (stickyBar) {
      stickyBar.classList.remove("is-hidden");
    }
  }

  /* Conversion link tracking (no-op until GA4 is enabled) */
  document.querySelectorAll('a[href^="tel:"]').forEach(function (a) {
    a.addEventListener("click", function () { track("tel_click", { source_page: currentPath }); });
  });
  document.querySelectorAll('a[href*="bit.ly/edu_cowork"], a[href*="docs.google.com/forms"]').forEach(function (a) {
    a.addEventListener("click", function () { track("googleform_click", { source_page: currentPath }); });
  });
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="/files/"]');
    if (!a) return;
    var path = a.getAttribute("href").split(/[?#]/)[0];
    if (!/\.pdf$/i.test(path)) return;
    track("file_download", { file_name: path.split("/").pop(), link_url: path, source_page: currentPath });
  });
  /* 과제별 자료 묶음(F01) — 묶음 이름·역할·도착 경로만 기록. 개인정보·검색어 없음. */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[data-bundle]");
    if (!a) return;
    track("resource_bundle_click", {
      source_page: currentPath,
      bundle_key: a.getAttribute("data-bundle") || "",
      bundle_role: a.getAttribute("data-bundle-role") || "article",
      link_url: (a.getAttribute("href") || "").split(/[?#]/)[0]
    });
  });
  /* Delegation also covers inquiry links rendered after a search/filter change.
     Preserve the existing event/fields; never include the visitor's search text. */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="/contact/"]');
    if (!a) return;
    var url;
    try { url = new URL(a.getAttribute("href"), window.location.origin); } catch (error) { return; }
    if (url.origin !== window.location.origin || url.pathname !== "/contact/") return;
    track("service_cta_click", {
      source_page: currentPath,
      service_key: url.searchParams.get("s") || "general",
      tier_key: url.searchParams.get("t") || "",
      cta_location: url.searchParams.get("cta") || ""
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

    /* 같은 내용의 재시도는 같은 키, 내용이 바뀐 문의는 새 키로 보낸다.
       문의 내용은 비교를 위해 이 페이지 메모리에만 보관한다. */
    var requestKeyEl = document.getElementById("cf-request-key");
    var lastSubmittedContent = null;
    function inquiryContent() {
      var data = new FormData(form);
      return JSON.stringify(["name", "org", "email", "phone", "service", "tier", "org_type", "budget", "timeline", "message", "privacy_agree", "marketing_agree"].map(function (name) {
        return data.get(name) || "";
      }));
    }
    function newRequestKey() {
      var key;
      try { key = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : null; } catch (e) { key = null; }
      if (!key) key = "rk-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
      if (requestKeyEl) requestKeyEl.value = key;
      return key;
    }
    if (requestKeyEl && !requestKeyEl.value) newRequestKey();

    var submitBtn = document.getElementById("cf-submit") || form.querySelector('button[type="submit"]');
    var submitLabel = submitBtn ? submitBtn.innerHTML : "";
    var sending = false;
    var lastSavedId = "";
    var lockedFields = [];
    function setSending(on, label) {
      sending = on;
      form.setAttribute("aria-busy", on ? "true" : "false");
      if (on) {
        lockedFields = Array.prototype.filter.call(form.querySelectorAll("input:not([type=hidden]), select, textarea, #cf-copy"), function (field) { return !field.disabled; });
        lockedFields.forEach(function (field) { field.disabled = true; });
      } else {
        lockedFields.forEach(function (field) { field.disabled = false; });
        lockedFields = [];
      }
      if (!submitBtn) return;
      submitBtn.disabled = on;
      submitBtn.innerHTML = on ? "전송 중…" : (label || submitLabel);
    }
    function hideSuccessCard() {
      var done = document.getElementById("cf-success");
      if (done) done.hidden = true;
    }
    /* 성공 카드는 Make가 접수번호와 함께 saved를 돌려준 경우에만 보인다. */
    function showSuccessCard(inquiryId) {
      var done = document.getElementById("cf-success");
      var idEl = document.getElementById("cf-inquiry-id");
      if (idEl) {
        idEl.hidden = !inquiryId;
        idEl.textContent = inquiryId ? "접수번호: " + inquiryId : "";
      }
      if (done) {
        done.hidden = false;
        done.focus({ preventScroll: true });
        try { done.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" }); } catch (e) { /* older browsers */ }
      }
    }
    function parseSaved(r) {
      /* Make가 Webhook Response 모듈로 {status:"saved", inquiry_id} 를 돌려줄 때만 "저장 완료"로 본다. */
      return r.text().then(function (txt) {
        var data = null;
        try { data = JSON.parse(txt); } catch (e) { data = null; }
        if (data && data.status === "saved" && typeof data.inquiry_id === "string" && data.inquiry_id.trim() && data.inquiry_id.length <= 120) return { saved: true, id: data.inquiry_id.trim() };
        if (data && data.status === "failed") throw new Error("failed");
        return { saved: false, id: "" };
      });
    }

    function validateText(field) {
      if (!field || !field.matches || !field.matches('input[required][type="text"], textarea[required]')) return;
      field.setCustomValidity(field.value && !field.value.trim() ? "공백을 제외한 내용을 입력해주세요." : "");
    }
    function validationMessage(field) {
      var label = field.labels && field.labels[0] ? field.labels[0].textContent.replace(/\*/g, "").trim() : "필수 항목";
      if (field.validity.typeMismatch && field.type === "email") return "이메일 주소 형식을 확인해주세요. 예: name@example.com";
      if (field.validity.customError) return label + ": " + field.validationMessage;
      if (field.validity.tooLong) return label + ": " + field.maxLength + "자 이내로 입력해주세요.";
      if (field.type === "checkbox") return "문의 처리를 위한 개인정보 수집·이용 동의가 필요합니다.";
      return label + " 항목을 입력해주세요.";
    }
    // Native validation blocks submit before the handler runs; report the first invalid field.
    /* The status line carries the error text; point the invalid field at it so screen readers read it with the field. */
    function linkError(field, on) {
      var ids = (field.getAttribute("aria-describedby") || "").split(/\s+/).filter(function (id) { return id && id !== "cf-status"; });
      if (on) ids.push("cf-status");
      if (ids.length) field.setAttribute("aria-describedby", ids.join(" ")); else field.removeAttribute("aria-describedby");
    }
    function clearErrors() {
      form.querySelectorAll("[aria-invalid]").forEach(function (field) { field.removeAttribute("aria-invalid"); linkError(field, false); });
    }
    form.addEventListener("invalid", function (ev) {
      ev.target.setAttribute("aria-invalid", "true");
      var firstInvalid = form.querySelector(":invalid");
      form.querySelectorAll('[aria-describedby~="cf-status"]').forEach(function (field) { if (field !== firstInvalid) linkError(field, false); });
      if (firstInvalid === ev.target) { linkError(ev.target, true); setStatus(validationMessage(ev.target)); }
    }, true);
    function onFieldEdit(ev) {
      validateText(ev.target);
      if (ev.target.getAttribute("aria-invalid") === "true" && ev.target.checkValidity()) { ev.target.removeAttribute("aria-invalid"); linkError(ev.target, false); }
      if (sending) return;
      if (lastSubmittedContent !== null) {
        setStatus(inquiryContent() !== lastSubmittedContent ?
          "내용을 변경하면 새 문의로 접수됩니다. 이전 문의가 이미 접수됐을 수 있으니 추가·정정 문의임을 적어주세요." :
          "같은 내용으로 다시 보내셔도 중복 접수되지 않습니다.");
      } else {
        var done = document.getElementById("cf-success");
        if (done && !done.hidden) { hideSuccessCard(); setStatus(""); }
      }
    }
    form.addEventListener("input", onFieldEdit);
    form.addEventListener("change", onFieldEdit);

    form.addEventListener("submit", function (ev) {
      var endpoint = form.getAttribute("data-endpoint");
      var msg = buildMessage();

      if (sending) { ev.preventDefault(); return; }

      form.querySelectorAll('input[required][type="text"], textarea[required]').forEach(validateText);
      if (typeof form.checkValidity === "function" && !form.checkValidity()) {
        ev.preventDefault();
        var firstInvalid = form.querySelector(":invalid");
        if (firstInvalid && typeof firstInvalid.focus === "function") firstInvalid.focus();
        if (typeof form.reportValidity === "function") form.reportValidity();
        if (firstInvalid) setStatus(validationMessage(firstInvalid));
        return;
      }

      if (honeypotFilled(form)) {
        ev.preventDefault();
        setStatus("접수를 보냈습니다. 접수 확인 중입니다 — 같은 내용으로 다시 보내도 중복 접수되지 않습니다.");
        return;
      }
      markElapsed(form);

      var params = readContext({ endpoint_type: endpoint ? "post_endpoint" : "mailto" });
      track("inquiry_submit_attempt", params);

      if (endpoint && endpoint !== "") {
        /* Real POST endpoint configured (Make etc.) — JS 없이도 action/method=post 로 같은 곳에 전송된다. */
        ev.preventDefault();
        var content = inquiryContent();
        if (lastSubmittedContent !== null && lastSubmittedContent !== content) newRequestKey();
        lastSubmittedContent = content;
        /* Capture before disabling the fields so every submitted value is preserved. */
        var submittedData = new FormData(form);
        setSending(true);
        hideSuccessCard();
        setStatus("전송 중입니다...");
        var controller = (typeof AbortController === "function") ? new AbortController() : null;
        var timer = controller ? setTimeout(function () { controller.abort(); }, 15000) : null;
        var opts = { method: "POST", body: submittedData, headers: { "Accept": "application/json" } };
        if (controller) opts.signal = controller.signal;
        fetch(endpoint, opts)
          .then(function (r) {
            if (!r.ok) throw new Error("status_" + r.status);
            return parseSaved(r);
          })
          .then(function (res) {
            if (timer) clearTimeout(timer);
            if (res.saved) {
              if (res.id !== lastSavedId) {
                lastSavedId = res.id;
                track("inquiry_saved", readContext({ endpoint_type: "post_endpoint" }));
                track("generate_lead", readContext({ endpoint_type: "post_endpoint" }));
              }
              setSending(false);
              form.reset();
              clearErrors();
              fillContactContext();
              lastSubmittedContent = null;
              newRequestKey();
              setStatus("문의가 접수되었습니다. 영업일 1일 내 회신드립니다.");
              showSuccessCard(res.id);
            } else {
              track("inquiry_sent_unconfirmed", readContext({ endpoint_type: "post_endpoint" }));
              setSending(false);
              hideSuccessCard();
              setStatus("전송했습니다 — 접수 확인 중입니다. 접수번호가 표시되지 않았다면 잠시 후 같은 내용으로 다시 보내 주세요(중복 접수되지 않습니다). 영업일 1일 내 회신이 없으면 ceo@nextcw.com 또는 010-9765-7749로 알려 주세요.");
            }
          })
          .catch(function (err) {
            if (timer) clearTimeout(timer);
            var reason = (err && err.name === "AbortError") ? "timeout" : ((err && err.message) || "network");
            track("inquiry_error", readContext({ endpoint_type: "post_endpoint", reason: reason }));
            setSending(false, "다시 보내기 <span class=\"arr\">→</span>");
            hideSuccessCard();
            /* 랜딩 폼은 ‘내용 복사’를 평소에 숨겨 두고, 전송이 안 될 때만 보여 준다. */
            if (copyBtn && copyBtn.hidden) copyBtn.hidden = false;
            if (reason === "timeout" || reason === "network" || reason === "Failed to fetch" || /fetch/i.test(reason)) {
              setStatus("접수 확인이 안 됐습니다. 입력하신 내용은 그대로 있으니 잠시 후 ‘다시 보내기’를 누르거나, ‘내용 복사’로 복사해 ceo@nextcw.com으로 보내주세요.");
            } else {
              setStatus("전송에 실패했습니다. 입력하신 내용은 그대로 있으니 ‘다시 보내기’를 누르거나, ‘내용 복사’로 복사해 ceo@nextcw.com 으로 보내주세요.");
            }
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

  /* Newsletter forms → fetch endpoint (no navigation). Falls back to form action if JS-less.
     insights의 #newsletter-form 외에 서비스 페이지의 form[data-newsletter]도 같은 로직으로 바인딩 */
  var newsForms = document.querySelectorAll("#newsletter-form, form[data-newsletter]");
  Array.prototype.forEach.call(newsForms, function (news) {
    var newsStatus = news.querySelector(".form-status");
    var newsBtn = news.querySelector('button[type="submit"]');
    var newsSending = false;
    news.addEventListener("submit", function (ev) {
      var endpoint = news.getAttribute("data-endpoint") || news.getAttribute("action");
      if (!endpoint) return;
      ev.preventDefault();
      if (newsSending) return;
      var agree = news.querySelector('input[name="newsletter_agree"]');
      if (agree && !agree.checked) {
        if (newsStatus) newsStatus.textContent = "소식 수신에 동의해주셔야 구독 신청이 됩니다.";
        try { agree.focus(); } catch (e) {}
        return;
      }
      if (typeof news.checkValidity === "function" && !news.checkValidity()) {
        if (typeof news.reportValidity === "function") news.reportValidity();
        return;
      }
      if (honeypotFilled(news)) {
        if (newsStatus) newsStatus.textContent = "구독 신청이 접수되었습니다. 감사합니다.";
        return;
      }
      markElapsed(news);
      newsSending = true;
      if (newsBtn) newsBtn.disabled = true;
      if (newsStatus) newsStatus.textContent = "구독 신청 중입니다...";
      fetch(endpoint, { method: "POST", body: new FormData(news), headers: { "Accept": "application/json" } })
        .then(function (r) {
          if (!r.ok) throw new Error("bad status");
          track("newsletter_signup", { source_page: currentPath, interest: (news.querySelector('input[name="interest"]') || {}).value || "general" });
          news.reset();
          if (newsStatus) newsStatus.textContent = "구독 신청이 접수되었습니다. 감사합니다.";
        })
        .catch(function () {
          if (newsStatus) newsStatus.textContent = "신청에 실패했습니다. ceo@nextcw.com으로 메일 주시면 등록해 드립니다.";
        })
        .then(function () { newsSending = false; if (newsBtn) newsBtn.disabled = false; });
    });
  });

  /* 연출 영상(data-autoplay-inview) — 화면에 40% 이상 보일 때만 소리 없이 재생, 벗어나거나 탭이 숨으면 정지.
     preload="none"이라 화면 근처에 오기 전에는 내려받지 않는다. 동작 줄이기·데이터 절약이면 자동 재생 안 함(기본 컨트롤 유지). */
  Array.prototype.forEach.call(document.querySelectorAll("video[data-autoplay-inview]"), function (v) {
    var frame = v.closest("figure") || v.parentNode;
    var ctrl = frame.querySelector(".fx-film-ctrl");
    var vName = v.getAttribute("data-video-name") || "brand_video";
    var conn = navigator.connection || {};
    var lite = conn.saveData || /(^|-)2g$/.test(conn.effectiveType || "");
    if (reduced || lite || !("IntersectionObserver" in window) || !ctrl) return;

    v.removeAttribute("controls");
    ctrl.hidden = false;
    var btnPlay = ctrl.querySelector('[data-film="play"]');
    var btnSound = ctrl.querySelector('[data-film="sound"]');
    var userPaused = false, inView = false;

    function sync() {
      frame.classList.toggle("is-paused", v.paused);
      btnPlay.setAttribute("aria-label", v.paused ? "영상 재생" : "영상 일시정지");
    }
    function tryPlay() {
      if (userPaused || !inView || document.hidden) return;
      var p = v.play();
      if (p && p.catch) p.catch(function () { sync(); });
    }
    v.addEventListener("play", sync);
    v.addEventListener("pause", sync);

    btnPlay.addEventListener("click", function () {
      if (v.paused) { userPaused = false; inView = true; tryPlay(); }
      else { userPaused = true; v.pause(); }
      track("video_control", { action: v.paused ? "pause" : "play", video: vName });
    });
    btnSound.addEventListener("click", function () {
      v.muted = !v.muted;
      frame.classList.toggle("is-sound", !v.muted);
      btnSound.setAttribute("aria-pressed", String(!v.muted));
      btnSound.setAttribute("aria-label", v.muted ? "소리 켜기" : "소리 끄기");
      if (!v.muted && v.paused) { userPaused = false; inView = true; tryPlay(); }
      track("video_control", { action: v.muted ? "mute" : "unmute", video: vName });
    });

    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        inView = e.isIntersecting && e.intersectionRatio >= 0.4;
        if (inView) tryPlay(); else if (!v.paused) v.pause();
      });
    }, { threshold: [0, 0.4] }).observe(v);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { if (!v.paused) v.pause(); } else tryPlay();
    });
    sync();
  });
})();
