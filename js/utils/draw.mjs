import { isMobile } from './helpers.mjs';
import { insertImageDataUrl } from '../editor.mjs';

/**
 * The "Draw a diagram" dialog: pen, eraser, line, arrow, rectangle, ellipse,
 * adjustable size and color, undo / redo. Uses pointer events, so mouse,
 * touch and pen all work the same way.
 */

const HISTORY_LIMIT = 30;

const drawCanvas = document.querySelector('canvas#diagram-canvas');
const ctx = drawCanvas.getContext('2d');

// Smaller canvas on phones
if (isMobile) {
  drawCanvas.height = 150;
  drawCanvas.width = 300;
}

const sizeInput = document.querySelector('#draw-size');
const colorInput = document.querySelector('#draw-color');
const toolButtons = Array.from(document.querySelectorAll('[data-tool]'));
const undoButton = document.querySelector('#draw-undo');
const redoButton = document.querySelector('#draw-redo');

let tool = 'pen';
let drawing = false;
let start = null;
let last = null;
let base = null; // canvas snapshot taken when a shape drag begins
let history = [];
let future = [];

const NAMED_COLORS = { black: '#000000', blue: '#000f55', red: '#ba3807' };
const toHex = (c) => NAMED_COLORS[c] || c;

/** Called when the page ink color changes, so drawings match the handwriting. */
function setInkColor(color) {
  colorInput.value = toHex(color);
}

function snapshot() {
  return ctx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
}

function updateHistoryButtons() {
  undoButton.disabled = history.length <= 1;
  redoButton.disabled = future.length === 0;
}

function pushHistory() {
  history.push(snapshot());
  if (history.length > HISTORY_LIMIT) history.shift();
  future = [];
  updateHistoryButtons();
}

function resetHistory() {
  history = [snapshot()];
  future = [];
  updateHistoryButtons();
}

function undo() {
  if (history.length <= 1) return;
  future.push(history.pop());
  ctx.putImageData(history[history.length - 1], 0, 0);
  updateHistoryButtons();
}

function redo() {
  if (!future.length) return;
  const next = future.pop();
  history.push(next);
  ctx.putImageData(next, 0, 0);
  updateHistoryButtons();
}

function pointFrom(e) {
  const rect = drawCanvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) * drawCanvas.width) / rect.width,
    y: ((e.clientY - rect.top) * drawCanvas.height) / rect.height
  };
}

function setBrush() {
  const size = Number(sizeInput.value) || 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = tool === 'eraser' ? size * 3 : size;
  ctx.strokeStyle = colorInput.value;
  ctx.fillStyle = colorInput.value;
  ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
}

function drawShape(a, b) {
  ctx.beginPath();
  if (tool === 'line' || tool === 'arrow') {
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    if (tool === 'arrow') {
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      const head = Math.max(10, ctx.lineWidth * 4);
      [Math.PI / 7, -Math.PI / 7].forEach((delta) => {
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(
          b.x - head * Math.cos(angle - delta),
          b.y - head * Math.sin(angle - delta)
        );
      });
    }
  } else if (tool === 'rect') {
    ctx.rect(a.x, a.y, b.x - a.x, b.y - a.y);
  } else if (tool === 'ellipse') {
    ctx.ellipse(
      (a.x + b.x) / 2,
      (a.y + b.y) / 2,
      Math.abs(b.x - a.x) / 2,
      Math.abs(b.y - a.y) / 2,
      0,
      0,
      Math.PI * 2
    );
  }
  ctx.stroke();
}

function onPointerDown(e) {
  if (e.button > 0) return;
  e.preventDefault();
  drawCanvas.setPointerCapture(e.pointerId);
  drawing = true;
  start = last = pointFrom(e);
  setBrush();
  if (tool === 'pen' || tool === 'eraser') {
    ctx.beginPath();
    ctx.arc(start.x, start.y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    base = snapshot();
  }
}

function onPointerMove(e) {
  if (!drawing) return;
  const p = pointFrom(e);
  setBrush();
  if (tool === 'pen' || tool === 'eraser') {
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  } else {
    ctx.putImageData(base, 0, 0);
    drawShape(start, p);
  }
  last = p;
}

function onPointerUp() {
  if (!drawing) return;
  drawing = false;
  base = null;
  ctx.globalCompositeOperation = 'source-over';
  pushHistory();
}

function setTool(next) {
  tool = next;
  toolButtons.forEach((b) =>
    b.setAttribute('aria-pressed', String(b.dataset.tool === next))
  );
  drawCanvas.style.cursor = next === 'eraser' ? 'cell' : 'crosshair';
}

function toggleDrawCanvas() {
  const drawContainer = document.querySelector('.draw-container');
  const opening = !drawContainer.classList.contains('show');
  document.querySelector('main').style.display = opening ? 'none' : 'block';
  drawContainer.classList.toggle('show');
  if (opening) drawCanvas.focus();
}

function clear() {
  ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  pushHistory();
}

function downloadFile() {
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = drawCanvas.toDataURL('image/png');
  a.download = 'diagram.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function addToPaper() {
  const dataUrl = drawCanvas.toDataURL('image/png');
  toggleDrawCanvas(); // show the page again first, so it can receive focus
  insertImageDataUrl(dataUrl, '80%');
}

/** "Add bg image": places a picture on the canvas so you can draw over it. */
const bgFileInput = document.querySelector('#image-to-add-in-canvas');
bgFileInput.addEventListener('change', () => {
  const file = bgFileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(
        drawCanvas.width / img.width,
        drawCanvas.height / img.height
      );
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(img, (drawCanvas.width - w) / 2, (drawCanvas.height - h) / 2, w, h);
      pushHistory();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
  bgFileInput.value = '';
});

/* Event listeners */
document.querySelector('#clear-draw-canvas').addEventListener('click', clear);
document.querySelector('#add-to-paper-button').addEventListener('click', addToPaper);
document.querySelector('#draw-download-button').addEventListener('click', downloadFile);
document
  .querySelector('#add-new-image-button')
  .addEventListener('click', () => bgFileInput.click());
undoButton.addEventListener('click', undo);
redoButton.addEventListener('click', redo);
toolButtons.forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool)));

drawCanvas.style.touchAction = 'none';
drawCanvas.tabIndex = 0;
drawCanvas.addEventListener('pointerdown', onPointerDown);
drawCanvas.addEventListener('pointermove', onPointerMove);
drawCanvas.addEventListener('pointerup', onPointerUp);
drawCanvas.addEventListener('pointercancel', onPointerUp);
drawCanvas.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    e.shiftKey ? redo() : undo();
  }
});

document.addEventListener('keydown', (e) => {
  const open = document.querySelector('.draw-container.show');
  if (open && e.key === 'Escape') toggleDrawCanvas();
});

setTool('pen');
resetHistory();

export { setInkColor, toggleDrawCanvas };
