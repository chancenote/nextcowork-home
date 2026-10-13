(function () {
  "use strict";

  var scenes = {
    bottleneck: { title: "초안은 끝났는데, 고객 답변은 어디에 있죠?", deck: "속도를 재는 지점을 바꾸면, 막힌 일이 보입니다." },
    select: { title: "첫 AX 과제는 어떻게 고를까요?", deck: "반복 · 현재 자료 · 사람 검토, 세 문을 통과하는 작은 업무부터." },
    handoff: { title: "문의 024는 누가 끝내나요?", deck: "AI, 사람, 기존 도구가 확인 지점을 두고 이어받습니다." },
    measure: { title: "20분 절약, 30분 추가 검토라면?", deck: "초안 시간만으로 성공을 말할 수 없는 이유를 계산합니다." }
  };
  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var previewScene = new URLSearchParams(window.location.search).get("scene");
  if (!Object.prototype.hasOwnProperty.call(scenes, previewScene)) previewScene = "bottleneck";

  Array.prototype.forEach.call(document.querySelectorAll(".ax-demo"), function (demo) {
    var isPreview = demo.id === "ax-demo";
    var name = isPreview ? previewScene : demo.getAttribute("data-scene");
    if (!Object.prototype.hasOwnProperty.call(scenes, name)) return;
    var scene = demo.querySelector(".ax-scene-" + name);
    var toggle = demo.querySelector(".ax-motion-toggle");
    if (!scene || !toggle) return;

    if (isPreview) {
      Array.prototype.forEach.call(demo.querySelectorAll(".ax-scene"), function (item) {
        item.classList.toggle("is-active", item === scene);
      });
      demo.querySelector("#ax-demo-title").textContent = scenes[name].title;
      demo.querySelector("#ax-demo-deck").textContent = scenes[name].deck;
      document.title = scenes[name].title + " — 넥스트코웍 개념 시연";
    }

    function syncMotion() {
      toggle.hidden = motionQuery.matches;
      if (motionQuery.matches) {
        demo.classList.remove("is-paused");
        toggle.textContent = "일시정지";
        toggle.setAttribute("aria-pressed", "false");
      }
    }

    toggle.addEventListener("click", function () {
      var paused = demo.classList.toggle("is-paused");
      toggle.textContent = paused ? "다시 재생" : "일시정지";
      toggle.setAttribute("aria-pressed", paused ? "true" : "false");
    });
    syncMotion();
    if (motionQuery.addEventListener) motionQuery.addEventListener("change", syncMotion);
    else if (motionQuery.addListener) motionQuery.addListener(syncMotion);
  });
}());
