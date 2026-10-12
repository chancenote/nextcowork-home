/* 인사이트 상세 공유 레일 — 패널 열기/닫기, 링크 복사, 카카오톡 공유, 링크형 채널 팝업.
   카카오톡은 JavaScript 키(developers.kakao.com, 사이트 도메인 등록 필요)가 있어야 공유 창이 뜬다.
   키가 없으면 모바일은 기기 공유 시트, 데스크톱은 링크 복사로 대신한다. */
(function () {
  "use strict";

  var KAKAO_JS_KEY = "06a3143a0c8f02ecdd765a43ef90cb54";
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
    imageWidth: Number(root.getAttribute("data-share-image-width")) || undefined,
    imageHeight: Number(root.getAttribute("data-share-image-height")) || undefined,
    slug: root.getAttribute("data-share-slug") || "",
    kakaoUrl: root.getAttribute("data-share-kakao-url") || "",
    contact: root.getAttribute("data-share-contact") || ""
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
    if (KAKAO_JS_KEY) loadKakao();
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

  /* SDK는 공유 패널을 열 때 미리 받는다. 카카오톡 버튼 클릭 뒤에 받으면 공유 창(window.open)이
     사용자 클릭과 떨어져 실행돼 사파리 등에서 팝업 차단에 걸릴 수 있다. */
  var kakaoScript = null;
  var kakaoWaiters = [];

  function loadKakao(callback) {
    if (window.Kakao) { if (callback) callback(); return; }
    if (callback) kakaoWaiters.push(callback);
    if (kakaoScript) return;
    kakaoScript = document.createElement("script");
    kakaoScript.src = KAKAO_SDK;
    kakaoScript.crossOrigin = "anonymous";
    kakaoScript.onload = function () {
      var waiters = kakaoWaiters; kakaoWaiters = [];
      waiters.forEach(function (fn) { fn(); });
    };
    kakaoScript.onerror = function () {
      console.warn("[share] 카카오 SDK를 불러오지 못했습니다:", KAKAO_SDK);
      var hadWaiters = kakaoWaiters.length > 0;
      kakaoWaiters = []; kakaoScript = null;
      if (hadWaiters) kakaoFallback();
    };
    document.head.appendChild(kakaoScript);
  }

  function kakaoFallback() {
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      navigator.share({ title: data.title, text: data.text, url: data.url }).catch(function () {});
      return;
    }
    copyLink("링크를 복사했습니다. 카카오톡 대화창에 붙여넣어 주세요");
  }

  /* 카드·버튼 링크는 빌드가 넣은 UTM 링크(utm_source=kakao)를 쓴다. 두 번째 버튼은 문의 폼으로 바로 간다. */
  function shareKakao() {
    if (!KAKAO_JS_KEY) { kakaoFallback(); return; }
    loadKakao(function () {
      try {
        if (!window.Kakao.isInitialized()) window.Kakao.init(KAKAO_JS_KEY);
        var readLink = { mobileWebUrl: data.kakaoUrl || data.url, webUrl: data.kakaoUrl || data.url };
        var buttons = [{ title: "글 읽기", link: readLink }];
        if (data.contact) buttons.push({ title: "무료 진단 문의", link: { mobileWebUrl: data.contact, webUrl: data.contact } });
        window.Kakao.Share.sendDefault({
          objectType: "feed",
          content: {
            title: data.title,
            description: data.text,
            imageUrl: data.image,
            imageWidth: data.imageWidth,
            imageHeight: data.imageHeight,
            link: readLink
          },
          buttons: buttons
        });
      } catch (e) {
        console.warn("[share] 카카오톡 공유 실패:", e);
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
