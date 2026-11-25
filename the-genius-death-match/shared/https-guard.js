/* Synchronous Secure Context guard + Anti-FOUC Theme bootstrap.
 * Loaded in <head> of index.html and all 20 games/<slug>/index.html before first paint. */
(function () {
  try {
    var saved = null;
    try { saved = localStorage.getItem('tgm_theme'); } catch (_) {}
    var theme = (saved === 'light' || saved === 'dark')
      ? saved
      : (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.dataset.theme = theme;
  } catch (_) {}

  try {
    var host = window.location.hostname;
    if (
      window.location.protocol === 'http:' &&
      host !== 'localhost' &&
      host !== '127.0.0.1' &&
      host !== '[::1]' &&
      !host.endsWith('.local') &&
      !/^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) {
      window.location.replace(
        'https://' +
          window.location.host +
          window.location.pathname +
          window.location.search +
          window.location.hash
      );
    }
  } catch (_) {}
})();
