/**
 * Rich-text editing on top of the handwriting page.
 *
 * - toolbar: undo/redo, paragraph style, bold/italic/underline/strike, font,
 *   size, color and highlight for the *selection*, alignment, lists, indent
 * - images: insert / paste / drop, resize (slider or corner handle), in-line,
 *   centered or floated with text wrapping, remove
 * - manual page breaks
 *
 * The page is a plain contenteditable, so the core flow (type text -> Generate
 * Image) is unchanged: formatting simply becomes part of the HTML that is
 * rendered to an image.
 */

const $ = (selector, root = document) => root.querySelector(selector);

const pageEl = $('.page-a');
const paper = $('.page-a .paper-content');
const toolbar = $('#editor-toolbar');
const imageTools = $('#image-tools');
const handle = $('#img-handle');
const container = $('.page-container');

// The image tools float over the page (so showing them never shifts the layout).
container.appendChild(imageTools);

let savedRange = null;
let lastSizePt = null;
let selectedImg = null;

/* ------------------------------------------------------------------ */
/* Selection helpers                                                   */
/* ------------------------------------------------------------------ */

const elementOf = (node) =>
  node && (node.nodeType === 1 ? node : node.parentElement);
const editableOf = (node) => {
  const el = elementOf(node);
  return el ? el.closest('[contenteditable="true"]') : null;
};
const inPage = (node) => !!node && pageEl.contains(node);

const changed = () => paper.dispatchEvent(new Event('input', { bubbles: true }));

document.addEventListener('selectionchange', () => {
  const sel = window.getSelection();
  if (sel.rangeCount && inPage(sel.anchorNode) && editableOf(sel.anchorNode)) {
    savedRange = sel.getRangeAt(0).cloneRange();
    updateToolbarState();
  }
});

/** Puts focus + caret back where the user was typing (toolbar controls steal it). */
function restoreSelection() {
  const sel = window.getSelection();
  const target = savedRange ? editableOf(savedRange.commonAncestorContainer) : null;
  (target || paper).focus({ preventScroll: true });
  if (savedRange && target) {
    sel.removeAllRanges();
    sel.addRange(savedRange);
  } else {
    const r = document.createRange();
    r.selectNodeContents(paper);
    r.collapse(false);
    sel.removeAllRanges();
    sel.addRange(r);
  }
}

function exec(command, value = null, css = true) {
  restoreSelection();
  document.execCommand('styleWithCSS', false, css);
  document.execCommand(command, false, value);
  normalizeFontTags();
  changed();
  updateToolbarState();
}

/* ------------------------------------------------------------------ */
/* Font size in pt (execCommand only knows sizes 1-7)                  */
/* ------------------------------------------------------------------ */

function normalizeFontTags() {
  if (lastSizePt == null) return;
  paper.querySelectorAll('font[size="7"]').forEach((f) => {
    const span = document.createElement('span');
    span.style.fontSize = lastSizePt + 'pt';
    while (f.firstChild) span.appendChild(f.firstChild);
    f.replaceWith(span);
  });
}

function applyFontSize(pt) {
  const size = parseFloat(pt);
  if (!Number.isFinite(size) || size < 4 || size > 60) return;
  lastSizePt = size;
  restoreSelection();
  document.execCommand('styleWithCSS', false, false); // emits <font size=7>
  document.execCommand('fontSize', false, '7');
  normalizeFontTags();
  changed();
}

// Text typed after choosing a size (collapsed caret) arrives in a new <font>.
paper.addEventListener('input', normalizeFontTags);

/* ------------------------------------------------------------------ */
/* Toolbar wiring                                                      */
/* ------------------------------------------------------------------ */

// Buttons must not steal focus from the page, or the selection is lost.
toolbar.addEventListener('mousedown', (e) => {
  if (e.target.closest('button')) e.preventDefault();
});
imageTools.addEventListener('mousedown', (e) => {
  if (e.target.closest('button')) e.preventDefault();
});

toolbar.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-cmd]');
  if (!btn) return;
  const cmd = btn.dataset.cmd;
  if (cmd === 'insertImage') return $('#fmt-image-file').click();
  if (cmd === 'pageBreak') return insertPageBreak();
  exec(cmd);
});

// Font family list mirrors the page font list.
const fontSelect = $('#fmt-font');
fontSelect.appendChild(new Option('Page font', ''));
document.querySelectorAll('#handwriting-font option').forEach((o) => {
  const opt = new Option(o.textContent.trim(), o.value);
  const style = o.getAttribute('style');
  if (style) opt.setAttribute('style', style);
  fontSelect.appendChild(opt);
});
fontSelect.addEventListener('change', () => {
  exec('fontName', fontSelect.value || 'inherit');
});

$('#fmt-block').addEventListener('change', (e) => {
  exec('formatBlock', e.target.value);
});
$('#fmt-size').addEventListener('change', (e) => applyFontSize(e.target.value));
$('#fmt-color').addEventListener('input', (e) => exec('foreColor', e.target.value));
$('#fmt-highlight').addEventListener('input', (e) =>
  exec('hiliteColor', e.target.value)
);

const STATE_COMMANDS = [
  'bold',
  'italic',
  'underline',
  'strikeThrough',
  'justifyLeft',
  'justifyCenter',
  'justifyRight',
  'justifyFull',
  'insertUnorderedList',
  'insertOrderedList'
];

function updateToolbarState() {
  try {
    STATE_COMMANDS.forEach((cmd) => {
      const btn = toolbar.querySelector(`button[data-cmd="${cmd}"]`);
      if (btn) btn.setAttribute('aria-pressed', String(document.queryCommandState(cmd)));
    });
    const block = (document.queryCommandValue('formatBlock') || 'p').toLowerCase();
    const select = $('#fmt-block');
    select.value = [...select.options].some((o) => o.value === block) ? block : 'p';
  } catch (e) {
    /* queryCommand* can throw when nothing is focused */
  }
}

/* ------------------------------------------------------------------ */
/* Page breaks                                                         */
/* ------------------------------------------------------------------ */

function insertPageBreak() {
  restoreSelection();
  document.execCommand(
    'insertHTML',
    false,
    '<div class="page-break" data-page-break="" contenteditable="false"></div><div><br></div>'
  );
  changed();
}

/* ------------------------------------------------------------------ */
/* Images                                                              */
/* ------------------------------------------------------------------ */

const MAX_IMAGE_PX = 1400;

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Shrinks big photos so the page (and its HTML) stays light. */
async function prepareImage(file) {
  const dataUrl = await readAsDataURL(file);
  if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) return dataUrl; // svg, gif
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  const scale = Math.min(1, MAX_IMAGE_PX / Math.max(img.naturalWidth, img.naturalHeight));
  if (scale === 1) return dataUrl;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.9);
}

/**
 * Inserts an image (data URL) at the caret. Used by the toolbar, paste, drop
 * and the drawing dialog.
 */
export function insertImageDataUrl(src, width = '50%') {
  restoreSelection();
  const id = 'img-' + Math.random().toString(36).slice(2);
  document.execCommand(
    'insertHTML',
    false,
    `<img class="page-img" id="${id}" alt="" src="${src}" style="width:${width}">`
  );
  const img = document.getElementById(id);
  if (img) {
    img.removeAttribute('id');
    selectImage(img);
  }
  changed();
}

async function insertImageFile(file) {
  try {
    insertImageDataUrl(await prepareImage(file));
  } catch (err) {
    alert('Sorry, that image could not be added.');
  }
}

$('#fmt-image-file').addEventListener('change', async (e) => {
  for (const file of Array.from(e.target.files)) await insertImageFile(file);
  e.target.value = '';
});

const imageFilesOf = (dataTransfer) =>
  Array.from((dataTransfer && dataTransfer.files) || []).filter((f) =>
    f.type.startsWith('image/')
  );

// Registered before the plain-text paste handler in app.mjs (which skips
// events that are already handled).
paper.addEventListener('paste', (e) => {
  const files = imageFilesOf(e.clipboardData);
  if (!files.length) return;
  e.preventDefault();
  files.forEach(insertImageFile);
});

paper.addEventListener('dragover', (e) => {
  if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) {
    e.preventDefault();
  }
});

paper.addEventListener('drop', async (e) => {
  const files = imageFilesOf(e.dataTransfer);
  if (!files.length) return;
  e.preventDefault();
  if (document.caretRangeFromPoint) {
    const r = document.caretRangeFromPoint(e.clientX, e.clientY);
    if (r && paper.contains(r.startContainer)) savedRange = r;
  }
  for (const file of files) await insertImageFile(file);
});

/* ---- selecting, aligning and resizing ---- */

function contentWidth() {
  const cs = getComputedStyle(paper);
  return (
    paper.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
  );
}

function widthPercent(img) {
  return Math.round((img.getBoundingClientRect().width / contentWidth()) * 100);
}

function selectImage(img) {
  if (selectedImg && selectedImg !== img) selectedImg.classList.remove('img-selected');
  selectedImg = img;
  img.classList.add('img-selected');
  imageTools.hidden = false;
  $('#img-size').value = Math.min(100, Math.max(10, widthPercent(img)));
  positionHandle();
}

export function deselectImage() {
  if (!selectedImg) return;
  selectedImg.classList.remove('img-selected');
  selectedImg = null;
  imageTools.hidden = true;
  handle.hidden = true;
}

function positionHandle() {
  if (!selectedImg || !selectedImg.isConnected) return deselectImage();
  const r = selectedImg.getBoundingClientRect();
  const page = pageEl.getBoundingClientRect();
  const c = container.getBoundingClientRect();
  const visible = r.bottom > page.top && r.top < page.bottom;
  handle.hidden = !visible;
  // keep the floating tools away from the image they edit
  const imageInUpperHalf = (r.top + r.bottom) / 2 < (page.top + page.bottom) / 2;
  imageTools.classList.toggle('tools-bottom', imageInUpperHalf);
  handle.style.left = r.right - c.left - 9 + 'px';
  handle.style.top = Math.min(r.bottom, page.bottom) - c.top - 9 + 'px';
}

paper.addEventListener('click', (e) => {
  if (e.target.tagName === 'IMG') {
    const range = document.createRange();
    range.selectNode(e.target);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    selectImage(e.target);
  } else {
    deselectImage();
  }
});

// Deselect on *click* (not mousedown): hiding the image tools shifts the layout,
// and doing that between mousedown and mouseup makes the clicked button move
// out from under the cursor, so its click never fires.
document.addEventListener('click', (e) => {
  if (!selectedImg) return;
  if (e.target === selectedImg || imageTools.contains(e.target) || handle.contains(e.target)) return;
  if (e.target.closest('#editor-toolbar')) return;
  deselectImage();
});

['scroll', 'input'].forEach((evt) => pageEl.addEventListener(evt, positionHandle));
window.addEventListener('resize', positionHandle);
pageEl.addEventListener('textor:layout', positionHandle);

$('#img-size').addEventListener('input', (e) => {
  if (!selectedImg) return;
  selectedImg.style.width = e.target.value + '%';
  selectedImg.style.height = 'auto';
  positionHandle();
  changed();
});

imageTools.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-img]');
  if (!btn || !selectedImg) return;
  const mode = btn.dataset.img;
  if (mode === 'delete') {
    selectedImg.remove();
    deselectImage();
    changed();
    return;
  }
  selectedImg.classList.remove('img-center', 'img-float-left', 'img-float-right');
  if (mode !== 'inline') selectedImg.classList.add('img-' + mode);
  positionHandle();
  changed();
});

// Corner handle: drag to resize while keeping the aspect ratio.
handle.addEventListener('pointerdown', (e) => {
  if (!selectedImg) return;
  e.preventDefault();
  handle.setPointerCapture(e.pointerId);
  const startX = e.clientX;
  const startW = selectedImg.getBoundingClientRect().width;
  const maxW = contentWidth();

  const move = (ev) => {
    const w = Math.min(maxW, Math.max(24, startW + (ev.clientX - startX)));
    selectedImg.style.width = ((w / maxW) * 100).toFixed(1) + '%';
    selectedImg.style.height = 'auto';
    $('#img-size').value = Math.round((w / maxW) * 100);
    positionHandle();
  };
  const up = () => {
    handle.removeEventListener('pointermove', move);
    handle.removeEventListener('pointerup', up);
    handle.removeEventListener('pointercancel', up);
    changed();
  };
  handle.addEventListener('pointermove', move);
  handle.addEventListener('pointerup', up);
  handle.addEventListener('pointercancel', up);
});

paper.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') deselectImage();
});
