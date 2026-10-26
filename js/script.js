/**
 * Mobile sidebar menu (shared by every page).
 * Keyboard accessible: Escape closes it, focus moves in and back out,
 * and aria-expanded reflects the state.
 */
(function () {
  var sidebar = document.getElementById('sidebar');
  var openBtn = document.getElementById('open-sidebar');
  var closeBtn = document.getElementById('close-sidebar');
  if (!sidebar || !openBtn || !closeBtn) return;

  function setOpen(open) {
    sidebar.classList.toggle('show', open);
    openBtn.setAttribute('aria-expanded', String(open));
    if (open) {
      closeBtn.focus();
    } else if (sidebar.contains(document.activeElement)) {
      openBtn.focus();
    }
  }

  openBtn.addEventListener('click', function () {
    setOpen(true);
  });
  closeBtn.addEventListener('click', function () {
    setOpen(false);
  });
  sidebar.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && sidebar.classList.contains('show')) setOpen(false);
  });
})();
