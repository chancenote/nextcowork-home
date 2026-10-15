const cards=[...document.querySelectorAll('.card')], stage=document.querySelector('.stage'),deck=document.querySelector('.deck'),play=document.querySelector('#play'),count=document.querySelector('.count');
let index=0,playing=false,timer=null;const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,record=new URLSearchParams(location.search).has('record');
function resize(){deck.style.transform='scale('+stage.clientWidth/1080+')'}
function show(i){cards[index].classList.remove('active');index=(i+10)%10;cards[index].classList.add('active');count.textContent=(index+1)+' / 10';if(playing)schedule()}
function schedule(){clearTimeout(timer);timer=setTimeout(()=>{if(index===9){stop();return}show(index+1)},8000)}
function stop(){playing=false;clearTimeout(timer);document.body.classList.remove('playing');play.textContent='자동 재생';play.setAttribute('aria-pressed','false')}
function start(){playing=true;document.body.classList.remove('paused');document.body.classList.add('playing');play.textContent='일시 정지';play.setAttribute('aria-pressed','true');schedule()}
play.onclick=()=>playing?stop():start();document.querySelector('#prev').onclick=()=>show(index-1);document.querySelector('#next').onclick=()=>show(index+1);document.querySelector('#restart').onclick=()=>{show(0);if(!reduce)start()};
document.addEventListener('keydown',e=>{if(e.key==='ArrowRight')show(index+1);if(e.key==='ArrowLeft')show(index-1)});let touchX=null;stage.addEventListener('touchstart',e=>touchX=e.changedTouches[0].clientX,{passive:true});stage.addEventListener('touchend',e=>{if(touchX!==null){let dx=e.changedTouches[0].clientX-touchX;if(Math.abs(dx)>45)show(index+(dx<0?1:-1));touchX=null}},{passive:true});
if(record)document.documentElement.classList.add('record');cards[0].classList.add('active');new ResizeObserver(resize).observe(stage);resize();if(record){window.startRecording=()=>{show(0);start()}}if(reduce){document.querySelector('.web-top span').textContent='동작 줄이기 설정 적용'}
