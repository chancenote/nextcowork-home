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
      ["founding", "CEO AI 코칭 (2h×5회)"],
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

    /* 요청키: 한 번의 문의에 붙는 고유값. 실패·재시도에도 유지하고, 원장 저장이 확인된 뒤에만 새로 만든다. */
    var requestKeyEl = document.getElementById("cf-request-key");
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
    function setSending(on, label) {
      sending = on;
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
        try { done.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) { /* older browsers */ }
      }
    }
    function parseSaved(r) {
      /* Make가 Webhook Response 모듈로 {status:"saved", inquiry_id} 를 돌려줄 때만 "저장 완료"로 본다. */
      return r.text().then(function (txt) {
        var data = null;
        try { data = JSON.parse(txt); } catch (e) { data = null; }
        if (data && data.status === "saved" && data.inquiry_id) return { saved: true, id: String(data.inquiry_id) };
        if (data && data.status === "failed") throw new Error("failed");
        return { saved: false, id: "" };
      });
    }

    // Native validation blocks submit before the handler below runs, so announce and mark fields here.
    form.addEventListener("invalid", function (ev) {
      ev.target.setAttribute("aria-invalid", "true");
      setStatus("입력하지 않은 필수 항목이 있습니다. 표시된 칸을 확인해주세요.");
    }, true);
    form.addEventListener("input", function (ev) {
      if (ev.target.getAttribute("aria-invalid") === "true" && ev.target.checkValidity()) ev.target.removeAttribute("aria-invalid");
    });
    form.addEventListener("change", function (ev) {
      if (ev.target.getAttribute("aria-invalid") === "true" && ev.target.checkValidity()) ev.target.removeAttribute("aria-invalid");
    });

    form.addEventListener("submit", function (ev) {
      var endpoint = form.getAttribute("data-endpoint");
      var msg = buildMessage();

      if (sending) { ev.preventDefault(); return; }

      if (typeof form.checkValidity === "function" && !form.checkValidity()) {
        ev.preventDefault();
        var firstInvalid = form.querySelector(":invalid");
        if (firstInvalid && typeof firstInvalid.focus === "function") firstInvalid.focus();
        if (typeof form.reportValidity === "function") form.reportValidity();
        setStatus("입력하지 않은 필수 항목이 있습니다. 표시된 칸을 확인해주세요.");
        return;
      }

      if (honeypotFilled(form)) {
        ev.preventDefault();
        setStatus("접수를 보냈습니다. 저장 확인 중입니다 — 같은 내용으로 다시 보내도 중복 저장되지 않습니다.");
        return;
      }
      markElapsed(form);

      var params = readContext({ endpoint_type: endpoint ? "post_endpoint" : "mailto" });
      track("inquiry_submit_attempt", params);

      if (endpoint && endpoint !== "") {
        /* Real POST endpoint configured (Make etc.) — JS 없이도 action/method=post 로 같은 곳에 전송된다. */
        ev.preventDefault();
        setSending(true);
        hideSuccessCard();
        setStatus("전송 중입니다...");
        var controller = (typeof AbortController === "function") ? new AbortController() : null;
        var timer = controller ? setTimeout(function () { controller.abort(); }, 15000) : null;
        var opts = { method: "POST", body: new FormData(form), headers: { "Accept": "application/json" } };
        if (controller) opts.signal = controller.signal;
        fetch(endpoint, opts)
          .then(function (r) {
            if (timer) clearTimeout(timer);
            if (!r.ok) throw new Error("status_" + r.status);
            return parseSaved(r);
          })
          .then(function (res) {
            if (res.saved) {
              if (res.id !== lastSavedId) {
                lastSavedId = res.id;
                track("inquiry_saved", readContext({ endpoint_type: "post_endpoint" }));
                track("generate_lead", readContext({ endpoint_type: "post_endpoint" }));
              }
              form.reset();
              fillContactContext();
              newRequestKey();
              setSending(false);
              setStatus("문의가 저장되었습니다. 영업일 1일 내 회신드립니다.");
              showSuccessCard(res.id);
            } else {
              track("inquiry_sent_unconfirmed", readContext({ endpoint_type: "post_endpoint" }));
              setSending(false);
              hideSuccessCard();
              setStatus("전송했습니다 — 저장 확인 중입니다. 접수번호가 표시되지 않았다면 잠시 후 같은 내용으로 다시 보내 주세요(중복 저장되지 않습니다). 영업일 1일 내 회신이 없으면 ceo@nextcw.com 또는 010-9765-7749로 알려 주세요.");
            }
          })
          .catch(function (err) {
            if (timer) clearTimeout(timer);
            var reason = (err && err.name === "AbortError") ? "timeout" : ((err && err.message) || "network");
            track("inquiry_error", readContext({ endpoint_type: "post_endpoint", reason: reason }));
            setSending(false, "다시 보내기 <span class=\"arr\">→</span>");
            hideSuccessCard();
            if (reason === "timeout" || reason === "network" || reason === "Failed to fetch" || /fetch/i.test(reason)) {
              setStatus("저장 확인이 안 됐습니다. 잠시 후 ‘다시 보내기’를 누르거나 ceo@nextcw.com으로 보내주세요.");
            } else {
              setStatus("전송에 실패했습니다. ‘다시 보내기’를 누르거나 아래 ‘내용 복사’로 복사해 ceo@nextcw.com 으로 보내주세요.");
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

  /* R9 · 좌측 고정 섹션 내비(.side-nav) 스크롤스파이 — 해당 요소가 있는 페이지에서만 동작 */
  var sideNav = document.querySelector(".side-nav");
  if (sideNav && "IntersectionObserver" in window) {
    var sideLinks = Array.prototype.slice.call(sideNav.querySelectorAll('a[href^="#"]'));
    var sideMap = {};
    var sideSections = sideLinks
      .map(function (a) {
        var el = document.getElementById(a.getAttribute("href").slice(1));
        if (el) sideMap[el.id] = a;
        return el;
      })
      .filter(Boolean);
    var sideSpy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            sideLinks.forEach(function (a) { a.classList.toggle("active", a === sideMap[en.target.id]); });
          }
        });
      },
      { rootMargin: "-35% 0px -55% 0px" }
    );
    sideSections.forEach(function (s) { sideSpy.observe(s); });
  }

  /* R10 · Public v2 — 좌측 레일(.px-rail)·모바일 칩바(.px-chipbar) 스크롤스파이.
     섹션이 길어 IO 대신 스크롤 위치 기준(참조 설계안 방식)으로 활성화한다. */
  var pxSpyLinks = Array.prototype.slice.call(document.querySelectorAll(".px-rail a.spy, .px-chipbar a.spy"));
  if (pxSpyLinks.length) {
    var pxIds = [];
    pxSpyLinks.forEach(function (a) {
      var id = a.getAttribute("href").slice(1);
      if (pxIds.indexOf(id) === -1) pxIds.push(id);
    });
    var pxSecs = pxIds.map(function (id) { return document.getElementById(id); }).filter(Boolean);
    var pxOnScroll = function () {
      var y = window.scrollY + 150;
      var cur = null;
      pxSecs.forEach(function (s) {
        if (s.getBoundingClientRect().top + window.scrollY <= y) cur = s.id;
      });
      pxSpyLinks.forEach(function (a) {
        a.classList.toggle("active", a.getAttribute("href") === "#" + cur);
      });
    };
    window.addEventListener("scroll", pxOnScroll, { passive: true });
    pxOnScroll();
  }
  /* 연출 영상(data-autoplay-inview) — 화면에 40% 이상 보일 때만 소리 없이 재생, 벗어나거나 탭이 숨으면 정지.
     preload="none"이라 화면 근처에 오기 전에는 내려받지 않는다. 동작 줄이기·데이터 절약이면 자동 재생 안 함(기본 컨트롤 유지). */
  Array.prototype.forEach.call(document.querySelectorAll("video[data-autoplay-inview]"), function (v) {
    var frame = v.closest("figure") || v.parentNode;
    var ctrl = frame.querySelector(".fx-film-ctrl");
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
      track("video_control", { action: v.paused ? "pause" : "play", video: "flexoffice_new_standard" });
    });
    btnSound.addEventListener("click", function () {
      v.muted = !v.muted;
      frame.classList.toggle("is-sound", !v.muted);
      btnSound.setAttribute("aria-pressed", String(!v.muted));
      btnSound.setAttribute("aria-label", v.muted ? "소리 켜기" : "소리 끄기");
      if (!v.muted && v.paused) { userPaused = false; inView = true; tryPlay(); }
      track("video_control", { action: v.muted ? "mute" : "unmute", video: "flexoffice_new_standard" });
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
