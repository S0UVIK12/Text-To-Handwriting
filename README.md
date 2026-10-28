# Textor – Text to Handwriting Converter

Convert typed text into realistic handwriting and download it as images or a multi-page PDF.
Free, no sign-up, and everything runs in the browser.

**Live site:** https://www.textor.co.in/

## Features

- 30+ handwriting fonts (including Hindi, Urdu, Arabic, Chinese, Japanese and Korean options)
- Upload your own handwriting as a `.ttf` / `.otf` font
- Ink color, font size, word / letter spacing and vertical position controls
- **Rich text editor** on the page: headings, bold / italic / underline / strikethrough, lists, alignment,
  indent, undo / redo, and a different font, size, color or highlight for any selection
- **Images on the page**: insert, paste or drop pictures; resize with a slider or the corner handle,
  center them, or float them left / right so the text wraps around them
- **Page layout**: A4, A5, Letter or Legal paper; ruled, grid, dotted or blank templates; line height;
  adjustable top, left, right and bottom page gaps
- **Live page preview** with automatic pagination, plus manual page breaks
- **Drawing tools**: pen, eraser, line, arrow, rectangle, ellipse, size, color, undo / redo
- Optional "handwriting realism" (slight baseline wobble, tilt and ink variation per word)
- Ruled paper and margin toggles, shadow / scanner page effects, adjustable resolution
- Automatic multi-page output with one-click PDF download (each page uses its own paper size)
- Light / dark mode, responsive layout, keyboard-accessible controls

## Run locally

```bash
npm install
npm run dev      # serves the site on http://localhost:5000
npm test         # Cypress tests (start the dev server first)
```

It is a static site (HTML, CSS and ES modules) – there is no build step.

## Project layout

| Path | Purpose |
| --- | --- |
| `index.html` | The converter and all on-page content (SEO copy, guide, FAQ) |
| `disclaimer.html`, `TaC.html`, `Privacy Policy.html` | Legal pages |
| `css/` | `styles.css` (shared nav/footer/a11y), `index.css` (converter), `features.css` (theme toggle, switches, popup), `editor.css` (toolbar, images, preview, drawing tools) |
| `js/` | `app.mjs` (wiring), `editor.mjs` (toolbar, images, page breaks), `layout.mjs` (paper / gaps), `preview.mjs` (live pages), `generate-images.mjs`, `utils/` (`paginate.mjs`, `draw.mjs`, `paper.mjs`, ...), `script.js` (menu), `theme.js` (dark mode) |
| `sitemap.xml`, `robots.txt`, `manifest.webmanifest`, `llms.txt` | Search / PWA metadata |

## SEO notes

See [SEO-UPGRADE-NOTES.md](SEO-UPGRADE-NOTES.md) for what is in place and the follow-up steps
(Search Console, Bing Webmaster Tools, Core Web Vitals checks).

## License

MIT
