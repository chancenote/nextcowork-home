(function () {
  "use strict";

  var scenes = {
    flow: {
      title: "Aside는 어떻게 작동할까?",
      deck: "탐색, 화면 분할, 현재 페이지 첨부가 한 업무에서 이어지는 방식"
    },
    appeal: {
      title: "왜 이 흐름이 매력적일까?",
      deck: "여러 화면을 오가는 동작보다, 한 결과물에 집중하는 사용 경험"
    },
    case: {
      title: "어떤 일을 맡기면 좋을까?",
      deck: "공개 교육 프로그램 두 곳을 근거가 있는 비교 초안으로 바꾸는 시연"
    }
  };

  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var params = new URLSearchParams(window.location.search);
  var previewScene = params.get("scene");
  if (!Object.prototype.hasOwnProperty.call(scenes, previewScene)) previewScene = "flow";

  Array.prototype.forEach.call(document.querySelectorAll(".demo"), function (demo) {
    var isPreview = demo.id === "demo";
    var sceneName = isPreview ? previewScene : demo.getAttribute("data-scene");
    if (!Object.prototype.hasOwnProperty.call(scenes, sceneName)) return;
    var currentScene = demo.querySelector(".scene-" + sceneName);
    var toggle = demo.querySelector(".motion-toggle");
    if (!currentScene || !toggle) return;

    if (isPreview) {
      Array.prototype.forEach.call(demo.querySelectorAll(".scene"), function (scene) {
        scene.classList.toggle("is-active", scene === currentScene);
      });
      demo.querySelector("#demo-title").textContent = scenes[sceneName].title;
      demo.querySelector("#demo-deck").textContent = scenes[sceneName].deck;
      document.title = scenes[sceneName].title + " — 넥스트코웍 개념 시연";
    }

    toggle.hidden = motionQuery.matches;
    toggle.addEventListener("click", function () {
      var paused = demo.classList.toggle("is-paused");
      toggle.textContent = paused ? "다시 재생" : "일시정지";
      toggle.setAttribute("aria-pressed", paused ? "true" : "false");
    });

    function onMotionChange() {
      toggle.hidden = motionQuery.matches;
      if (motionQuery.matches) {
        demo.classList.remove("is-paused");
        toggle.textContent = "일시정지";
        toggle.setAttribute("aria-pressed", "false");
      }
    }

    if (motionQuery.addEventListener) motionQuery.addEventListener("change", onMotionChange);
    else if (motionQuery.addListener) motionQuery.addListener(onMotionChange);
  });
}());
