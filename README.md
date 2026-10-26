# Textor – Text to Handwriting Converter

Convert typed text into realistic handwriting and download it as images or a multi-page PDF.
Free, no sign-up, and everything runs in the browser.

**Live site:** https://www.textor.co.in/

## Features

- 30+ handwriting fonts (including Hindi, Urdu, Arabic, Chinese, Japanese and Korean options)
- Upload your own handwriting as a `.ttf` / `.otf` font
- Ink color, font size, word / letter spacing and vertical position controls
- Ruled paper and margin toggles, shadow / scanner page effects, adjustable resolution
- Draw simple diagrams and add them to the page
- Automatic multi-page output with one-click PDF download
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
| `css/` | `styles.css` (shared nav/footer/a11y), `index.css` (converter), `features.css` (theme toggle, switches, drawing dialog) |
| `js/` | `app.mjs` (wiring), `generate-images.mjs`, `utils/`, `script.js` (menu), `theme.js` (dark mode) |
| `sitemap.xml`, `robots.txt`, `manifest.webmanifest`, `llms.txt` | Search / PWA metadata |

## SEO notes

See [SEO-UPGRADE-NOTES.md](SEO-UPGRADE-NOTES.md) for what is in place and the follow-up steps
(Search Console, Bing Webmaster Tools, Core Web Vitals checks).

## License

MIT
