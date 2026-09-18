const { renderMagazine, searchNotes } = await import('./insights-cards.js' + new URL(import.meta.url).search);
const root = document.getElementById('feed');
const data = window.NCW_FEED || [];
const discovery = document.getElementById('insights-discovery');
const pageSize = 12;
function imageFallbacks() {
  document.querySelectorAll('.thumb-cover img, .latest-note-cover img').forEach(image => {
    const fallback = () => { if (image.getAttribute('src') !== '/img/og.png') image.src = '/img/og.png'; };
    image.addEventListener('error', fallback, {once:true});
    if (image.complete && !image.naturalWidth) fallback();
  });
}
if (root && discovery && data.length) {
  discovery.hidden = false;
  const input = document.getElementById('insights-query');
  const topicsRoot = document.getElementById('insights-topics');
  const tagsRoot = document.getElementById('insights-tags');
  const pagination = document.getElementById('insights-pagination');
  const reset = document.getElementById('insights-reset');
  const posts = data.filter(item=>item.src==='insight');
  const topics = [...new Set(posts.map(item=>item.topic).filter(Boolean))];
  const tags = [...new Set(posts.flatMap(item=>item.tags || []))];
  let state, timer;
  const tagStep = 20, tagBase = 6;
  let tagTerm = '', showAllTags = false, tagLimit = tagStep;
  const tagQuery = document.getElementById('insights-tag-query');
  const showTags = document.getElementById('tag-show-all');
  const selectedTag = document.getElementById('insights-selected-tag');
  function readState() {
    const params = new URL(location.href).searchParams;
    return {q:params.get('q') || '', topic:params.get('topic') || '',tag:params.get('tag') || '',page:Math.max(1,parseInt(params.get('page'),10)||1)};
  }
  function saveState(push=false) {
    const url = new URL(location.href);
    ['q','topic','tag'].forEach(key=>state[key] ? url.searchParams.set(key,state[key]) : url.searchParams.delete(key));
    state.page>1 ? url.searchParams.set('page',state.page) : url.searchParams.delete('page');
    history[push?'pushState':'replaceState'](null,'',url);
  }
  function button(label, value, key) {
    const el = document.createElement('button'); el.type='button'; el.textContent=label;
    el.setAttribute('aria-pressed',String(state[key]===value)); el.dataset.filterKey=key;el.dataset.filterValue=value;
    el.addEventListener('click',()=>{clearTimeout(timer);state[key]=state[key]===value && key==='tag' ? '' : value;state.page=1;saveState(true);render();[...document.querySelectorAll('[data-filter-key]')].find(node=>node.dataset.filterKey===key&&node.dataset.filterValue===value)?.focus();});
    return el;
  }
  function renderTags() {
    const normalizeTag=value=>value.normalize('NFKC').toLowerCase().replace(/챗지피티|챗gpt/g,'chatgpt').replace(/클로드/g,'claude').replace(/\s+/g,'');
    const contextNotes=searchNotes(data,{q:state.q,topic:state.topic});
    const countOf=tag=>contextNotes.filter(note=>(note.tags||[]).includes(tag)).length;
    /* 기본 6개는 현재 조건에서의 노트 수 내림차순, 동률은 이름 오름차순. */
    const ranked=[...tags].sort((a,b)=>countOf(b)-countOf(a) || a.localeCompare(b,'ko'));
    const matching=ranked.filter(tag=>normalizeTag(tag).includes(normalizeTag(tagTerm)));
    const expanded=Boolean(tagTerm)||showAllTags;
    const visible=expanded?matching.slice(0,tagLimit):matching.slice(0,tagBase);
    tagsRoot.replaceChildren();
    visible.forEach(tag=>{
      const count=countOf(tag);
      const el=button('',tag,'tag'); el.className='tag-choice';
      const mark=document.createElement('span');mark.className='tag-choice-mark';mark.textContent=state.tag===tag?'✓':'#';mark.setAttribute('aria-hidden','true');
      const name=document.createElement('span');name.className='tag-choice-name';name.textContent=tag;name.title=tag;
      const badge=document.createElement('span');badge.className='tag-choice-count';badge.textContent=count;
      /* 연결되는 노트가 없는 태그는 선택할 수 없다. 단 이미 선택된 태그는 해제할 수 있어야 한다. */
      if(count===0 && state.tag!==tag) el.disabled=true;
      el.setAttribute('aria-label',tag+' · 노트 '+count+'개');el.append(mark,name,badge);tagsRoot.append(el);
    });
    if(!matching.length) {
      const empty=document.createElement('p');empty.className='tag-no-match';empty.textContent='찾는 태그가 없습니다. 다른 단어로 검색해보세요.';
      const clearTerm=document.createElement('button');clearTerm.type='button';clearTerm.className='tag-term-clear';clearTerm.textContent='검색어 지우기';
      clearTerm.addEventListener('click',()=>{tagTerm='';tagQuery.value='';tagLimit=tagStep;renderTags();tagQuery.focus();});
      tagsRoot.append(empty,clearTerm);
    } else if(expanded && matching.length>visible.length) {
      const more=document.createElement('button');more.type='button';more.className='tag-more';more.textContent='태그 '+tagStep+'개 더 보기';
      more.addEventListener('click',()=>{tagLimit+=tagStep;renderTags();tagsRoot.querySelector('.tag-more')?.focus();});
      tagsRoot.append(more);
    }
    document.getElementById('tag-match-count').textContent=tagTerm ? '일치하는 태그 '+matching.length+'개' : '태그 '+tags.length+'개';
    showTags.hidden=Boolean(tagTerm)||tags.length<=tagBase;
    showTags.textContent=showAllTags?'주요 태그만 보기':'전체 태그 보기';showTags.setAttribute('aria-expanded',String(showAllTags));
  }
  function render() {
    input.value=state.q;
    const active=Boolean(state.q.trim() || state.topic || state.tag);
    const matches=active?searchNotes(data,state):data;
    const pages=Math.max(1,Math.ceil(matches.length/pageSize));
    const requestedPage=state.page;state.page=Math.min(state.page,pages);if(requestedPage!==state.page)saveState();
    const pageItems=matches.slice((state.page-1)*pageSize,state.page*pageSize);
    root.innerHTML=pageItems.length?renderMagazine(pageItems):'<div class="insights-empty"><h3>조건에 맞는 노트가 없습니다.</h3><p>검색어를 줄이거나 주제·태그 조건을 지워 다시 찾아보세요.</p><button type="button" class="btn btn-ghost" id="empty-reset">조건 초기화</button></div>';
    document.getElementById('latest-note').hidden=active;
    const count=document.getElementById('insights-result-count');
    count.textContent=active ? `${state.q ? '“'+state.q+'” · ' : ''}${[state.topic,state.tag].filter(Boolean).join(' · ')}${state.topic||state.tag?' · ':''}노트 ${matches.length}개 · ${state.q.trim()?'관련도순':'최신순'}` : `노트 ${posts.length}개 · 채널·자료실 ${data.length-posts.length}개`;
    reset.hidden=!active;
    topicsRoot.replaceChildren(button('전체','', 'topic'),...topics.map(topic=>button(topic,topic,'topic')));
    renderTags();
    selectedTag.replaceChildren(); selectedTag.hidden=!state.tag;
    if(state.tag) {
      const label=document.createElement('span');label.textContent='선택한 태그';
      const remove=document.createElement('button');remove.type='button';remove.textContent=state.tag+' ×';remove.setAttribute('aria-label',state.tag+' 태그 해제');
      remove.addEventListener('click',()=>{state.tag='';state.page=1;saveState(true);render();tagQuery.focus();});
      selectedTag.append(label,remove);
    }
    pagination.replaceChildren();pagination.hidden=pages<=1;
    for(let number=1;number<=pages;number++) {
      const link=document.createElement('a');const url=new URL(location.href);url.searchParams.set('page',number);url.hash='latest-content';
      link.href=url.pathname+url.search+url.hash;link.textContent=number;
      if(number===state.page)link.setAttribute('aria-current','page');
      link.addEventListener('click',event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();state.page=number;saveState(true);render();document.getElementById('latest-content').scrollIntoView();});pagination.append(link);
    }
    document.getElementById('empty-reset')?.addEventListener('click',clear);
    imageFallbacks();
  }
  function clear() {clearTimeout(timer);tagTerm='';tagQuery.value='';showAllTags=false;tagLimit=tagStep;state={q:'',topic:'',tag:'',page:1};saveState(true);render();input.focus();}
  state=readState();render();
  tagQuery.addEventListener('input',()=>{tagTerm=tagQuery.value;tagLimit=tagStep;renderTags();});
  showTags.addEventListener('click',()=>{showAllTags=!showAllTags;tagLimit=tagStep;renderTags();});
  input.addEventListener('input',event=>{clearTimeout(timer);if(event.isComposing)return;timer=setTimeout(()=>{state.q=input.value;state.page=1;saveState();render();},200);});
  document.getElementById('insights-search').addEventListener('submit',event=>{event.preventDefault();clearTimeout(timer);state.q=input.value;state.page=1;saveState(true);render();});
  reset.addEventListener('click',clear);
  addEventListener('popstate',()=>{clearTimeout(timer);state=readState();render();});
} else if(root && !root.firstElementChild) root.innerHTML=renderMagazine(data);
imageFallbacks();
