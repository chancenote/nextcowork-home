/* 앤트로픽 S-1 단독 페이지 — 읽기 진행 막대·PC 목차 레일 (CSP: 인라인 스크립트 금지라 외부 파일) */
(function(){
  var bar=document.querySelector('.progress'), rail=document.querySelector('.rail');
  var links=rail?Array.prototype.slice.call(rail.querySelectorAll('li a')):[];
  var secs=links.map(function(a){return document.querySelector(a.getAttribute('href'));});
  var start=document.getElementById('ch1'), end=document.querySelector('.cta-band');
  function tick(){
    var h=document.documentElement, max=h.scrollHeight-h.clientHeight;
    if(bar) bar.style.transform='scaleX('+(max>0?Math.min(1,h.scrollTop/max):0)+')';
    if(rail){
      rail.classList.toggle('on', !!start && start.getBoundingClientRect().top<window.innerHeight*.6 && (!end || end.getBoundingClientRect().top>window.innerHeight*.75));
      var cur=-1; secs.forEach(function(s,i){ if(s && s.getBoundingClientRect().top<window.innerHeight*.35) cur=i; });
      links.forEach(function(a,i){ a.classList.toggle('on', i===cur); if(i===cur) a.setAttribute('aria-current','true'); else a.removeAttribute('aria-current'); });
    }
  }
  var raf=0; window.addEventListener('scroll',function(){ if(!raf) raf=requestAnimationFrame(function(){raf=0;tick();}); },{passive:true});
  window.addEventListener('resize',tick); tick();
})();
