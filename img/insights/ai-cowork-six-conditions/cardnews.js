(function(){
  var q=new URLSearchParams(location.search),n=parseInt(q.get('card')||'0',10);
  var frames=[].slice.call(document.querySelectorAll('.frame'));
  function fit(){if(document.body.classList.contains('solo'))return;var s=Math.min(1,(innerWidth-40)/1080,(innerHeight-80)/1350);frames.forEach(function(f){f.style.setProperty('--s',s)});}
  function flow(){var c=document.querySelector('.c5');if(!c)return;var C=c.getBoundingClientRect(),sc=C.width/1080;
    var rw=[].slice.call(c.querySelectorAll('.rw')).map(function(e){var b=e.getBoundingClientRect(),l=e.querySelector('.lb').getBoundingClientRect();return{t:(b.top-C.top)/sc,b:(b.bottom-C.top)/sc,r:(b.right-C.left)/sc-80,x:(l.left+l.width/2-C.left)/sc-80,m:(b.top+b.height/2-C.top)/sc}});
    function set(id,d){var p=c.querySelector('#'+id);p.setAttribute('d',d);var L=Math.ceil(p.getTotalLength());p.style.setProperty('--len',L);}
    set('a1','M'+rw[0].x+' '+(rw[0].b+6)+' V'+(rw[1].t-18));
    set('a2','M'+rw[1].x+' '+(rw[1].b+6)+' V'+(rw[2].t-18));
    set('a3','M'+(rw[2].r+8)+' '+rw[2].m+' H'+(rw[2].r+70)+' V'+rw[0].m+' H'+(rw[0].r+30));
    var svg=c.querySelector('.flow');function head(pts,col,d){var g=document.createElementNS('http://www.w3.org/2000/svg','polygon');g.setAttribute('points',pts);g.setAttribute('fill',col);g.style.setProperty('--d',d);svg.appendChild(g);}
    head((rw[0].x-14)+','+(rw[1].t-18)+' '+(rw[0].x+14)+','+(rw[1].t-18)+' '+rw[0].x+','+(rw[1].t-2),'#6955BA','1.4s');
    head((rw[1].x-14)+','+(rw[2].t-18)+' '+(rw[1].x+14)+','+(rw[2].t-18)+' '+rw[1].x+','+(rw[2].t-2),'#6955BA','1.85s');
    head((rw[0].r+32)+','+(rw[0].m-16)+' '+(rw[0].r+32)+','+(rw[0].m+16)+' '+(rw[0].r+10)+','+rw[0].m,'#9178E2','2.48s');}
  document.fonts.ready.then(flow);
  if(n){document.body.classList.add('solo');frames[n-1].classList.add('on');}
  else{
    fit();addEventListener('resize',fit);
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){var c=e.target;c.classList.remove('play');void c.offsetWidth;c.classList.add('play');}})},{threshold:.6});
    frames.forEach(function(f){io.observe(f);f.addEventListener('click',function(){this.classList.remove('play');void this.offsetWidth;this.classList.add('play');});});
  }
})();
