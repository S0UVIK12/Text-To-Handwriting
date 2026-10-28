/**
 * Paper sizes (millimetres). The editor shows an A4 page 400px wide and scales
 * the other sizes relative to it, so a font size in pt looks the same
 * proportion of the page as it would on real paper.
 */
export const PAPER_MM = {
  a4: { w: 210, h: 297 },
  a5: { w: 148, h: 210 },
  letter: { w: 215.9, h: 279.4 },
  legal: { w: 215.9, h: 355.6 }
};

const A4_EDITOR_WIDTH_PX = 400;

export const paperOf = (size) => PAPER_MM[size] || PAPER_MM.a4;

/** Width of the editor page, in CSS px, for a paper size. */
export const pageWidthPx = (size) =>
  (A4_EDITOR_WIDTH_PX * paperOf(size).w) / PAPER_MM.a4.w;

/** Height / width ratio of a paper size. */
export const pageRatio = (size) => paperOf(size).h / paperOf(size).w;

export const mmToPt = (mm) => (mm * 72) / 25.4;
