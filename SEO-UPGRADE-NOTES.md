# SEO & UX notes

Last updated: 2026-10-27. This replaces the earlier (2025-10-25) notes, which listed an `.htaccess`
file that was never in the repo. The site is served from GitHub Pages (see `CNAME`), which ignores
`.htaccess`, so server-side redirects, headers and compression are handled by the host / CDN instead.

## What is in place

**Titles, descriptions, canonicals**
- One unique `<title>` and `<meta name="description">` (≤ 160 chars) per page.
- `rel="canonical"` on every page; internal links point to `./` so the home page has a single URL.
- Single `<h1>` per page; legal pages use `<h2>` for sections.

**Social previews**
- Open Graph + Twitter `summary_large_image` tags with a self-hosted 1200×630 image
  (`images/og-image.png`) instead of a third-party hotlink.

**Structured data (JSON-LD, `index.html`)**
- `WebSite`, `WebApplication` and `FAQPage` in one `@graph`. The FAQ text matches the visible FAQ.
- Removed: the `aggregateRating` (the 4.8 / 1250 figures were not backed by real reviews, which violates
  Google's structured-data guidelines and can trigger a manual action) and the personal email address.
  Add a rating back only if it is generated from real, visible user reviews.

**Crawling**
- `sitemap.xml` (accurate `lastmod`; `changefreq` / `priority` dropped because Google ignores them).
- `robots.txt` (no `Crawl-delay`, which Google ignores), `llms.txt` anchors fixed.

**Performance (Core Web Vitals)**
- Google Fonts stylesheet loads non-blocking (it was a malformed, render-blocking `<link>`).
- `html2canvas` and `jsPDF` are `defer`red; `jsPDF` is pinned to 1.5.3 instead of `@^1`.
- Fixed image sizes to avoid layout shift; analytics and ads scripts are `async` at the end of `<head>`.
- Theme is applied before first paint (no light/dark flash).

**Accessibility (also an SEO signal)**
- Skip link, `<main>`, labelled editable page area, `aria-current`, keyboard-operable menu (Esc closes it),
  visible `:focus-visible` outlines, `aria-pressed` theme toggle, labelled dialog, 44 px touch targets,
  `prefers-reduced-motion` support, readable dark-mode form controls.

## Next steps (need your accounts, so not done here)

1. Verify `https://www.textor.co.in/` in **Google Search Console**, submit `sitemap.xml`, and use
   *URL Inspection → Request indexing* for the home page.
2. Do the same in **Bing Webmaster Tools**.
3. Run **PageSpeed Insights** on mobile and compare LCP / CLS / INP before and after.
4. Check the **Rich Results Test** for the `WebApplication` markup. FAQ rich results are now shown only for
   a small set of sites, so don't expect FAQ snippets.
5. Decide on the apex vs `www` host once and keep it consistent in GitHub Pages' domain settings.
6. Consider renaming `Privacy Policy.html` to `privacy-policy.html` (and `TaC.html` to `terms.html`) with
   a stub redirect page, so URLs have no `%20`.
7. Longer term: dedicated landing pages (e.g. handwriting fonts, PDF export, assignment writing) will do more
   for rankings than meta tweaks.
