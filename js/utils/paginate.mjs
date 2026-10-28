/**
 * Splits the (rich) content of the editor page into pages.
 *
 * The old approach split innerHTML on whitespace, which corrupts tags as soon
 * as the content has formatting. This one walks the DOM instead:
 *   - text is split at word boundaries (or per character for CJK),
 *   - inline / block elements are cloned as "shells" and continued on the
 *     next page,
 *   - images and other atomic nodes move to the next page whole,
 *   - an element with [data-page-break] forces a new page.
 *
 * Measuring happens in an off-screen clone of the page, so the real editor
 * (caret, selection, scroll position) is never touched.
 */

const CJK = '\\u3000-\\u9fff\\uac00-\\ud7af\\uff00-\\uffef';
const TOKEN_RE = new RegExp(`\\s+|[${CJK}]|[^\\s${CJK}]+`, 'g');
const CJK_RE = new RegExp(`[${CJK}]`);
const ATOMIC = new Set(['IMG', 'HR', 'CANVAS', 'SVG', 'VIDEO', 'INPUT']);

const isPageBreak = (n) => n.nodeType === 1 && n.hasAttribute('data-page-break');
const hasPageBreak = (n) =>
  n.nodeType === 1 && (isPageBreak(n) || !!n.querySelector('[data-page-break]'));

function createMeasurer(pageEl) {
  const m = pageEl.cloneNode(true);
  m.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
  m.removeAttribute('id');
  m.querySelectorAll('[contenteditable]').forEach((el) =>
    el.removeAttribute('contenteditable')
  );
  m.classList.add('measurer');
  m.setAttribute('aria-hidden', 'true');
  document.body.appendChild(m);
  return m;
}

/** Height (px) that content may use on one page. */
function pageLimit(measurer) {
  const top = measurer.querySelector('.top-margin');
  const topH = top ? top.offsetHeight : 0;
  const bottom =
    parseFloat(measurer.style.getPropertyValue('--bottom-margin')) || 0;
  return measurer.clientHeight - topH - bottom;
}

/**
 * @param {HTMLElement} pageEl the `.page-a` element
 * @returns {string[]} one HTML string per page (page-break markers removed)
 */
export function paginate(pageEl) {
  const source = pageEl.querySelector('.paper-content');
  const measurer = createMeasurer(pageEl);
  const pc = measurer.querySelector('.paper-content');
  const limit = pageLimit(measurer);

  const queue0 = Array.from(source.childNodes).map((n) => n.cloneNode(true));
  pc.innerHTML = '';

  const ctx = {
    broke: false,
    fits: () => pc.scrollHeight <= limit + 0.5,
    empty: () =>
      !pc.textContent.trim() && !pc.querySelector('img,svg,canvas,hr,video')
  };

  const pages = [];
  try {
    let queue = queue0;
    let guard = 0;
    while (queue.length && guard++ < 1000) {
      pc.innerHTML = '';
      ctx.broke = false;
      let rest = [];
      for (let i = 0; i < queue.length; i++) {
        const rem = place(queue[i], pc, ctx);
        if (rem) {
          rest = [rem, ...queue.slice(i + 1)];
          break;
        }
        if (ctx.broke) {
          rest = queue.slice(i + 1);
          break;
        }
      }
      pages.push({ html: pc.innerHTML, empty: ctx.empty() });
      queue = rest;
    }
  } finally {
    measurer.remove();
  }

  // Trailing blank pages (e.g. from a stray <br> or a break at the very end)
  while (pages.length > 1 && pages[pages.length - 1].empty) pages.pop();
  if (!pages.length) pages.push({ html: '', empty: true });
  return pages.map((p) => p.html);
}

/**
 * Appends `node` to `target` if it fits, otherwise appends as much as fits and
 * returns the remainder (a node) to continue on the next page, or null.
 */
function place(node, target, ctx) {
  if (isPageBreak(node)) {
    ctx.broke = true;
    return null;
  }
  if (node.nodeType === 3) return placeText(node, target, ctx);
  if (node.nodeType !== 1) return null;

  if (!hasPageBreak(node)) {
    const whole = node.cloneNode(true);
    target.appendChild(whole);
    if (ctx.fits()) return null;
    target.removeChild(whole);
  }

  const tag = node.tagName.toUpperCase();
  // A <br> that does not fit just ends the page.
  if (tag === 'BR') return null;

  if (ATOMIC.has(tag) || !node.firstChild) {
    if (ctx.empty()) {
      // Never loop forever on something taller than a page.
      target.appendChild(node.cloneNode(true));
      return null;
    }
    return node;
  }

  // Container: place children one by one inside an empty shell of the element.
  const shell = node.cloneNode(false);
  target.appendChild(shell);
  const kids = Array.from(node.childNodes);
  for (let i = 0; i < kids.length; i++) {
    const rem = place(kids[i], shell, ctx);
    if (rem || ctx.broke) {
      if (!shell.hasChildNodes() && !ctx.empty()) {
        // nothing of this element fit: move it whole to the next page
        target.removeChild(shell);
        return node;
      }
      const restShell = node.cloneNode(false);
      if (rem) restShell.appendChild(rem);
      for (let j = i + 1; j < kids.length; j++) {
        restShell.appendChild(kids[j].cloneNode(true));
      }
      if (tag === 'OL') {
        const done = kids
          .slice(0, i)
          .filter((k) => k.nodeType === 1 && k.tagName === 'LI').length;
        restShell.setAttribute(
          'start',
          String((parseInt(node.getAttribute('start'), 10) || 1) + done + (rem ? 1 : 0))
        );
      }
      if (rem && rem.nodeType === 1 && rem.tagName === 'LI') {
        rem.style.listStyle = 'none'; // continuation of a split list item
      }
      return restShell;
    }
  }
  return null;
}

function placeText(node, target, ctx) {
  const text = node.data;
  const t = document.createTextNode(text);
  target.appendChild(t);
  if (ctx.fits()) return null;

  if (!text.trim()) {
    // whitespace that does not fit is simply dropped
    target.removeChild(t);
    return null;
  }

  const tokens = text.match(TOKEN_RE) || [];
  let lo = 0;
  let hi = tokens.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    t.data = tokens.slice(0, mid).join('');
    if (ctx.fits()) lo = mid;
    else hi = mid - 1;
  }
  let m = lo;
  while (m > 0 && !tokens[m - 1].trim()) m--;

  if (m === 0) {
    target.removeChild(t);
    if (!ctx.empty()) return node; // whole text goes to the next page
    // empty page: force the first word so we always make progress
    let k = 0;
    while (k < tokens.length && !tokens[k].trim()) k++;
    k++;
    target.appendChild(document.createTextNode(tokens.slice(0, k).join('')));
    const forcedRest = tokens.slice(k).join('').replace(/^\s+/, '');
    return forcedRest ? document.createTextNode(forcedRest) : null;
  }

  t.data = tokens.slice(0, m).join('').replace(/\s+$/, '');
  const rest = tokens.slice(m).join('').replace(/^\s+/, '');
  return rest ? document.createTextNode(rest) : null;
}

/**
 * Optional "handwritten" imperfection: every word gets a tiny random baseline
 * shift, tilt and ink-opacity change. Only applied to the rendered page, never
 * to what the user is editing.
 */
export function applyRealism(html, level) {
  const amp =
    level === 'natural'
      ? { y: 1, rot: 1.2, op: 0.14 }
      : level === 'subtle'
      ? { y: 0.5, rot: 0.5, op: 0.07 }
      : null;
  if (!amp) return html;

  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const walker = document.createTreeWalker(tpl.content, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  const rnd = () => Math.random() * 2 - 1;
  for (const n of nodes) {
    if (!n.data.trim() || CJK_RE.test(n.data)) continue;
    const frag = document.createDocumentFragment();
    n.data.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) {
        frag.appendChild(document.createTextNode(part));
        return;
      }
      const s = document.createElement('span');
      s.textContent = part;
      s.style.cssText =
        'display:inline-block;' +
        `transform:translateY(${(rnd() * amp.y).toFixed(2)}px) rotate(${(
          rnd() * amp.rot
        ).toFixed(2)}deg);` +
        `opacity:${(1 - Math.random() * amp.op).toFixed(2)}`;
      frag.appendChild(s);
    });
    n.parentNode.replaceChild(frag, n);
  }
  return tpl.innerHTML;
}
