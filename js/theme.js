/**
 * Light / dark mode toggle.
 * The initial theme is applied by a tiny inline script at the top of <body>
 * (to avoid a flash); this file wires up the button and persists the choice.
 */
(function () {
  var btn = document.querySelector('.dark-mode-toggle');
  if (!btn) return;

  function sync() {
    btn.setAttribute('aria-pressed', String(document.body.classList.contains('dark')));
  }

  sync();
  btn.addEventListener('click', function () {
    var isDark = document.body.classList.toggle('dark');
    try {
      window.localStorage.setItem('prefers-theme', isDark ? 'dark' : 'light');
    } catch (e) {
      /* storage unavailable */
    }
    sync();
  });
})();
