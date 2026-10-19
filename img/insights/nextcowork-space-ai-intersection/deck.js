(function () {
  var TOTAL = 24;
  var TITLES = [
    "표지 · 일이 잘되는 공간, 일이 잘되는 방식", "회사 개요", "왜 공간과 AI를 함께 다루는가", "서비스 구조 · 4개 상품과 결합 상품",
    "FlexOffice 컨설팅", "FlexOffice 단계와 비용", "운영 실적 · 스페이스코웍", "사례 · 송도 복합업무시설",
    "적용 자산 유형", "Public Advisory", "공공 자문 실적", "AI Campus",
    "교육 설계 방법 · AI IMPACT", "강의 · 교육 주제", "대표 레퍼런스", "CEO AI 코칭",
    "결합 상품 · Smart FlexOffice", "의뢰 가능한 과업", "대표 컨설턴트", "함께한 곳",
    "고객의 평가", "진행 절차", "자주 받는 질문", "연락처"
  ];
  var img = document.getElementById("slide");
  var count = document.getElementById("count");
  var prev = document.getElementById("prev");
  var next = document.getElementById("next");
  var cur = 1;
  var m = /[?&]p=(\d+)/.exec(location.search);
  if (m) cur = Math.min(TOTAL, Math.max(1, parseInt(m[1], 10)));

  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function preload(n) { if (n >= 1 && n <= TOTAL) { var i = new Image(); i.src = "deck/slide-" + pad(n) + ".webp"; } }
  function show(n) {
    cur = Math.min(TOTAL, Math.max(1, n));
    img.src = "deck/slide-" + pad(cur) + ".webp";
    img.alt = "넥스트코웍 회사소개서 " + cur + "쪽 — " + TITLES[cur - 1];
    count.textContent = cur + " / " + TOTAL;
    prev.disabled = cur === 1;
    next.disabled = cur === TOTAL;
    if (history.replaceState) history.replaceState(null, "", "?p=" + cur);
    preload(cur + 1);
    preload(cur - 1);
  }
  prev.addEventListener("click", function () { show(cur - 1); });
  next.addEventListener("click", function () { show(cur + 1); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") show(cur - 1);
    if (e.key === "ArrowRight") show(cur + 1);
  });
  var x0 = null;
  img.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  img.addEventListener("touchend", function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) show(dx < 0 ? cur + 1 : cur - 1);
    x0 = null;
  }, { passive: true });
  show(cur);
})();
