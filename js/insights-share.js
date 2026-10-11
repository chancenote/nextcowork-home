/* 인사이트 상세 공유 레일 — 패널 열기/닫기, 링크 복사, 카카오톡 공유, 링크형 채널 팝업.
   카카오톡은 JavaScript 키(developers.kakao.com, 사이트 도메인 등록 필요)가 있어야 공유 창이 뜬다.
   키가 없으면 모바일은 기기 공유 시트, 데스크톱은 링크 복사로 대신한다. */
(function () {
  "use strict";

  var KAKAO_JS_KEY = "";
  var KAKAO_SDK = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";

  var root = document.querySelector(".post-share");
  if (!root) return;

  var toggle = root.querySelector(".post-share-toggle");
  var panel = root.querySelector(".post-share-panel");
  var closeBtn = root.querySelector(".post-share-close");
  var toast = root.querySelector(".post-share-toast");
  var data = {
    url: root.getAttribute("data-share-url") || location.href,
    title: root.getAttribute("data-share-title") || document.title,
    text: root.getAttribute("data-share-text") || "",
    image: root.getAttribute("data-share-image") || "",
    slug: root.getAttribute("data-share-slug") || ""
  };
  var toastTimer = null;

  function track(method) {
    if (typeof window.gtag === "function") {
      window.gtag("event", "share", { method: method, content_type: "article", item_id: data.slug });
    }
  }

  function showToast(message) {
    toast.textContent = message;
    root.classList.add("is-toast");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { root.classList.remove("is-toast"); }, 2600);
  }

  function openPanel() {
    panel.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    root.classList.add("is-open");
    var first = panel.querySelector(".share-item");
    if (first) first.focus();
  }

  function closePanel(returnFocus) {
    if (panel.hidden) return;
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    root.classList.remove("is-open");
    if (returnFocus) toggle.focus();
  }

  function copyLink(message) {
    var done = function () { showToast(message || "링크를 복사했습니다"); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(data.url).then(done, legacyCopy);
    } else {
      legacyCopy();
    }
    function legacyCopy() {
      var input = document.createElement("textarea");
      input.value = data.url;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      document.body.removeChild(input);
      if (ok) done(); else window.prompt("아래 링크를 복사하세요", data.url);
    }
  }

  function loadKakao(callback) {
    if (window.Kakao) { callback(); return; }
    var script = document.createElement("script");
    script.src = KAKAO_SDK;
    script.crossOrigin = "anonymous";
    script.onload = callback;
    script.onerror = function () { kakaoFallback(); };
    document.head.appendChild(script);
  }

  function kakaoFallback() {
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      navigator.share({ title: data.title, text: data.text, url: data.url }).catch(function () {});
      return;
    }
    copyLink("링크를 복사했습니다. 카카오톡 대화창에 붙여넣어 주세요");
  }

  function shareKakao() {
    if (!KAKAO_JS_KEY) { kakaoFallback(); return; }
    loadKakao(function () {
      try {
        if (!window.Kakao.isInitialized()) window.Kakao.init(KAKAO_JS_KEY);
        window.Kakao.Share.sendDefault({
          objectType: "feed",
          content: {
            title: data.title,
            description: data.text,
            imageUrl: data.image,
            link: { mobileWebUrl: data.url, webUrl: data.url }
          },
          buttons: [{ title: "글 읽기", link: { mobileWebUrl: data.url, webUrl: data.url } }]
        });
      } catch (e) {
        kakaoFallback();
      }
    });
  }

  toggle.addEventListener("click", function () {
    if (panel.hidden) openPanel(); else closePanel(false);
  });
  closeBtn.addEventListener("click", function () { closePanel(true); });

  root.addEventListener("click", function (event) {
    var item = event.target.closest(".share-item");
    if (!item) return;
    var method = item.getAttribute("data-share");
    track(method);
    if (method === "copy") { copyLink(); closePanel(false); return; }
    if (method === "kakao") { shareKakao(); closePanel(false); return; }
    if (method === "mail") { closePanel(false); return; }
    /* 링크형 채널: 새 탭 대신 작은 창으로 연다. 팝업이 막히면 기본 링크 동작(새 탭)으로 둔다. */
    var popup = window.open(item.href, "ncw-share", "width=600,height=640");
    if (popup) { popup.opener = null; event.preventDefault(); }
    closePanel(false);
  });

  document.addEventListener("click", function (event) {
    if (!root.contains(event.target)) closePanel(false);
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closePanel(true);
  });

  /* 좁은 화면의 플로팅 버튼은 제목 영역을 지난 뒤에 나타난다. */
  var hero = document.querySelector(".post-hero");
  if (hero && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      root.classList.toggle("is-past-hero", !entries[0].isIntersecting);
    }).observe(hero);
  } else {
    root.classList.add("is-past-hero");
  }
})();
