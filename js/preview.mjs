/**
 * Live multi-page preview: shows small thumbnails of every page the current
 * content will be split into, using the same paginator as image generation.
 */
import { paginate } from './utils/paginate.mjs';

const pageEl = document.querySelector('.page-a');
const list = document.querySelector('#page-preview-list');
const count = document.querySelector('#page-preview-count');
const details = document.querySelector('.page-preview');
const form = document.querySelector('#generate-image-form');

const THUMB_WIDTH = 130;
let timer = null;

function buildBase() {
  const base = pageEl.cloneNode(true);
  base.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
  base.removeAttribute('id');
  base.querySelectorAll('[contenteditable]').forEach((el) =>
    el.removeAttribute('contenteditable')
  );
  base.querySelectorAll('.page-break').forEach((el) => el.remove());
  base.querySelectorAll('.img-selected').forEach((el) =>
    el.classList.remove('img-selected')
  );
  base.querySelector('.paper-content').innerHTML = '';
  base.setAttribute('aria-hidden', 'true');
  return base;
}

function render() {
  timer = null;
  if (!details.open) return;

  const pages = paginate(pageEl);
  const base = buildBase();
  const pageW = pageEl.offsetWidth;
  const pageH = pageEl.offsetHeight;
  const scale = THUMB_WIDTH / pageW;

  const figures = pages.map((html, i) => {
    const fig = document.createElement('figure');
    fig.className = 'page-thumb';
    const frame = document.createElement('div');
    frame.className = 'page-thumb-frame';
    frame.style.width = THUMB_WIDTH + 'px';
    frame.style.height = Math.round(pageH * scale) + 'px';
    const clone = base.cloneNode(true);
    clone.querySelector('.paper-content').innerHTML = html;
    clone.style.transform = `scale(${scale})`;
    frame.appendChild(clone);
    const cap = document.createElement('figcaption');
    cap.textContent = 'Page ' + (i + 1);
    fig.append(frame, cap);
    return fig;
  });

  list.replaceChildren(...figures);
  count.textContent = pages.length + (pages.length === 1 ? ' page' : ' pages');
}

export function schedulePreview() {
  clearTimeout(timer);
  timer = setTimeout(render, 350);
}

form.addEventListener('input', schedulePreview);
form.addEventListener('change', schedulePreview);
pageEl.addEventListener('textor:layout', schedulePreview);
details.addEventListener('toggle', schedulePreview);
window.addEventListener('load', schedulePreview);
if (document.fonts) {
  document.fonts.addEventListener('loadingdone', schedulePreview);
  document.fonts.ready.then(schedulePreview);
}
schedulePreview();
