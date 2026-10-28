import { paperOf, mmToPt } from './paper.mjs';

const pageEl = document.querySelector('.page-a');
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

function addFontFromFile(fileObj) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const newFont = new FontFace('temp-font', e.target.result);
    newFont.load().then((loadedFace) => {
      document.fonts.add(loadedFace);
      pageEl.style.fontFamily = 'temp-font';
    });
  };
  reader.readAsArrayBuffer(fileObj);
}

/**
 * @method createPDF
 * @param canvases generated page canvases
 * @description
 * Creates a PDF with one page per image. Each page uses the paper size the
 * image was generated with (A4, A5, Letter or Legal) and the image fills it.
 */
function createPDF(canvases) {
  if (!canvases.length) return;
  const sizeOf = (canvas) => {
    const paper = paperOf(canvas.dataset && canvas.dataset.paper);
    return [mmToPt(paper.w), mmToPt(paper.h)];
  };
  const [firstW, firstH] = sizeOf(canvases[0]);
  // eslint-disable-next-line new-cap
  const doc = new jsPDF({ unit: 'pt', format: [firstW, firstH], orientation: 'p' });
  canvases.forEach((canvas, i) => {
    const [w, h] = sizeOf(canvas);
    if (i > 0) doc.addPage([w, h], 'p');
    doc.addImage(canvas, 'JPEG', 0, 0, w, h, 'image-' + i);
  });
  doc.save('textor-handwriting.pdf');
}

const escapeHtml = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function formatText(event) {
  // image pastes are handled (and prevented) by editor.mjs
  if (event.defaultPrevented) return;
  event.preventDefault();
  // Plain text only. Escape it, otherwise pasted "<b>" would turn into HTML.
  const text = escapeHtml(event.clipboardData.getData('text/plain')).replace(
    /\r?\n/g,
    '<br/>'
  );
  document.execCommand('insertHTML', false, text);
}

function addPaperFromFile(file) {
  const tmppath = URL.createObjectURL(file);
  pageEl.style.backgroundImage = `url(${tmppath})`;
}

export { isMobile, addFontFromFile, createPDF, formatText, addPaperFromFile };
