const video = document.getElementById('demo');
const start = document.getElementById('start');
const status = document.getElementById('status');

start.hidden = false;
start.addEventListener('click', async () => {
  start.disabled = true;
  status.textContent = '';
  try {
    await video.play();
    video.focus();
  } catch {
    status.textContent = '재생하지 못했습니다. 영상 파일 직접 열기 링크를 이용해 주세요.';
    start.hidden = false;
  } finally {
    start.disabled = false;
  }
});
video.addEventListener('play', () => { start.hidden = true; });
video.addEventListener('ended', () => {
  start.textContent = '▶ 다시 재생';
  start.hidden = false;
});
video.addEventListener('error', () => {
  status.textContent = '영상을 불러오지 못했습니다. 영상 파일 직접 열기 링크를 이용해 주세요.';
  start.hidden = false;
});
