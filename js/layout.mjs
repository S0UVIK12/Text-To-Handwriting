/**
 * Page layout controls: paper size, paper template, line height and the four
 * page gaps (top / left / right / bottom). Everything is driven by CSS custom
 * properties on the `.page-a` element, so the live page, the page preview and
 * the generated images always agree.
 */
import { pageWidthPx, pageRatio } from './utils/paper.mjs';

const pageEl = document.querySelector('.page-a');

const clamp = (v, min, max, fallback) => {
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

const setVar = (name, value) => pageEl.style.setProperty(name, value);

const CONTROLS = {
  '#page-size': (v) => {
    const size = ['a4', 'a5', 'letter', 'legal'].includes(v) ? v : 'a4';
    setVar('--page-w', pageWidthPx(size).toFixed(2) + 'px');
    setVar('--page-ratio', String(pageRatio(size)));
  },
  '#paper-template': (v) => {
    pageEl.dataset.template = v;
  },
  '#line-height': (v) => setVar('--line-height', clamp(v, 1, 3, 1.5) + 'em'),
  '#margin-top': (v) => setVar('--top-margin', clamp(v, 0, 200, 50) + 'px'),
  '#margin-left': (v) => setVar('--left-margin', clamp(v, 0, 200, 50) + 'px'),
  '#margin-right': (v) => setVar('--right-margin', clamp(v, 0, 200, 5) + 'px'),
  '#margin-bottom': (v) => {
    const px = clamp(v, 0, 200, 0);
    setVar('--bottom-margin', px + 'px');
    pageEl.classList.toggle('has-bottom-margin', px > 0);
  }
};

for (const [selector, apply] of Object.entries(CONTROLS)) {
  const el = document.querySelector(selector);
  if (!el) continue;
  const onChange = () => {
    apply(el.value);
    pageEl.dispatchEvent(new CustomEvent('textor:layout', { bubbles: true }));
  };
  el.addEventListener('input', onChange);
  el.addEventListener('change', onChange);
  apply(el.value); // sync initial state
}
