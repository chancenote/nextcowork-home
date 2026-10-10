/* Public Advisory v4 — 서브내비 스크롤스파이 · 옛 앵커 호환 · 자문 영역 펼침 라벨 · 이력 탭/복사. 전역 main.js와 독립(CSP: script-src 'self'). */
(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* 1) 상단 고정 서브내비 — 히어로가 화면에서 사라지면 표시, 현재 섹션 강조 */
  var subnav = document.querySelector(".pa-subnav");
  var hero = document.querySelector(".pa-hero");
  if (subnav && hero && "IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { subnav.classList.toggle("is-on", !e.isIntersecting && e.boundingClientRect.top < 0); });
    }, { threshold: 0 }).observe(hero);
    var links = Array.prototype.slice.call(subnav.querySelectorAll("ul a[href^='#']"));
    var secs = links.map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); }).filter(Boolean);
    var spy = function () {
      var y = window.scrollY + 140, cur = null;
      secs.forEach(function (s) { if (s.offsetTop <= y) cur = s.id; });
      links.forEach(function (a) { a.classList.toggle("is-active", a.getAttribute("href") === "#" + cur); });
    };
    window.addEventListener("scroll", spy, { passive: true });
    spy();
  }

  /* 2) 옛 앵커 호환 — #space-build 등 과거 공유 링크가 오면 해당 자문 영역을 펼친 채로 이동 */
  var alias = {
    "space-build": "scope-space", "space-activate": "scope-space", "space": "scope-space",
    "ai": "scope-work", "ax": "scope-work", "work": "scope-work",
    "startup": "scope-standard", "forum": "scope-standard", "ext": "scope-standard",
    "outcomes": "process"
  };
  function openFor(hash) {
    var id = (hash || "").replace("#", "");
    if (!id) return;
    var target = alias[id] || id;
    var el = document.getElementById(target);
    if (!el) return;
    var det = el.querySelector("details");
    if (det && /^scope-/.test(target)) det.open = true;
    if (alias[id]) {
      setTimeout(function () { el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" }); }, 30);
    }
  }
  openFor(location.hash);
  window.addEventListener("hashchange", function () { openFor(location.hash); });
  /* 히어로 Core 카드 → 자문 영역 행을 펼친 채로 이동 */
  Array.prototype.forEach.call(document.querySelectorAll(".pa-core-card[href^='#scope-']"), function (a) {
    a.addEventListener("click", function () {
      var el = document.getElementById(a.getAttribute("href").slice(1));
      var det = el && el.querySelector("details");
      if (det) det.open = true;
    });
  });

  /* 3) 자문 영역 행 — 펼침 버튼 라벨 동기화 */
  Array.prototype.forEach.call(document.querySelectorAll(".pa-row details"), function (d) {
    var sum = d.querySelector("summary .pa-row-toggle");
    var sync = function () { if (sum) sum.textContent = d.open ? "접기" : "자세히"; };
    d.addEventListener("toggle", sync); sync();
  });

  /* 4) 수행 이력 — 영역 탭 + '보고용으로 복사' */
  var hist = document.querySelector(".pa-history");
  if (hist) {
    var tabs = hist.querySelectorAll(".pa-tab");
    var groups = hist.querySelectorAll(".pa-hist-group");
    var setTab = function (key) {
      tabs.forEach(function (t) { var on = t.getAttribute("data-tab") === key; t.classList.toggle("is-active", on); t.setAttribute("aria-selected", on ? "true" : "false"); });
      groups.forEach(function (g) { g.hidden = key !== "all" && g.getAttribute("data-group") !== key; });
    };
    tabs.forEach(function (t) { t.addEventListener("click", function () { setTab(t.getAttribute("data-tab")); }); });
    var copyBtn = hist.querySelector(".pa-copy");
    var status = hist.querySelector(".pa-copy-status");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var lines = ["넥스트코웍 이종찬 대표 — 공공 수행 이력 (출처: nextcw.com/public, " + new Date().toISOString().slice(0, 10) + ")", ""];
        groups.forEach(function (g) {
          if (g.hidden) return;
          lines.push("[" + g.getAttribute("data-label") + "]");
          g.querySelectorAll("li").forEach(function (li) { lines.push("- " + li.textContent.replace(/\s+/g, " ").trim()); });
          lines.push("");
        });
        var text = lines.join("\n");
        var done = function (ok) {
          if (status) { status.textContent = ok ? "복사했습니다. 보고 문서에 붙여넣으세요." : "복사에 실패했습니다. 목록을 드래그해 복사해 주세요."; status.hidden = false; }
          copyBtn.textContent = ok ? "복사됨" : "보고용으로 복사";
          setTimeout(function () { copyBtn.textContent = "보고용으로 복사"; }, 2200);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
        } else {
          try {
            var ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "absolute"; ta.style.left = "-9999px";
            document.body.appendChild(ta); ta.select(); var ok = document.execCommand("copy"); document.body.removeChild(ta); done(ok);
          } catch (e) { done(false); }
        }
      });
    }
  }
})();
