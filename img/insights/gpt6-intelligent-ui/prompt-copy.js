// GPT-6 인사이트 전용 — 프롬프트 박스(.post-body pre > code.language-text) 복사 버튼.
(() => {
  if (window.__gpt6PromptCopy) return;
  window.__gpt6PromptCopy = true;

  const DONE_LABEL = '복사 완료';
  const IDLE_LABEL = '복사하기';
  const FAIL_MESSAGE = '자동 복사가 되지 않았습니다. 프롬프트 글을 선택해 두었으니 Ctrl+C(Mac은 ⌘+C)로 직접 복사해 주세요.';

  const selectText = (node) => {
    const selection = window.getSelection();
    if (!selection) return false;
    const range = document.createRange();
    range.selectNodeContents(node);
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  };

  const legacyCopy = (code) => {
    try {
      return selectText(code) && document.execCommand('copy');
    } catch {
      return false;
    }
  };

  const copyText = async (code) => {
    const text = code.textContent;
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // 권한 거부 등 — 아래 폴백으로 진행
      }
    }
    return legacyCopy(code);
  };

  const enhance = (code, index) => {
    const pre = code.parentElement;
    if (pre.dataset.promptCopy === 'ready' || pre.closest('.gpt6-prompt')) return;
    pre.dataset.promptCopy = 'ready';

    const wrap = document.createElement('div');
    wrap.className = 'gpt6-prompt';
    pre.parentNode.insertBefore(wrap, pre);
    wrap.appendChild(pre);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'gpt6-prompt__copy';
    button.textContent = IDLE_LABEL;
    button.setAttribute('aria-label', `프롬프트 ${index + 1} 복사하기`);

    const status = document.createElement('p');
    status.className = 'gpt6-prompt__status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

    wrap.insertBefore(button, pre);
    wrap.appendChild(status);

    let resetTimer;
    button.addEventListener('click', async () => {
      clearTimeout(resetTimer);
      status.textContent = '';
      button.disabled = true;
      const ok = await copyText(code);
      button.disabled = false;
      if (ok) {
        window.getSelection()?.removeAllRanges();
        button.textContent = DONE_LABEL;
        button.classList.add('is-done');
        status.textContent = `프롬프트 ${index + 1} 복사 완료`;
        resetTimer = setTimeout(() => {
          button.textContent = IDLE_LABEL;
          button.classList.remove('is-done');
          status.textContent = '';
        }, 2500);
      } else {
        pre.focus();
        selectText(code);
        status.textContent = FAIL_MESSAGE;
      }
    });
  };

  const init = () => {
    document
      .querySelectorAll('.post--gpt6-intelligent-ui .post-body pre > code.language-text')
      .forEach(enhance);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
