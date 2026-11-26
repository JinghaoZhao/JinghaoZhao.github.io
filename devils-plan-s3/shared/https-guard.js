/* Synchronous Secure Context & FOUC-Free Theme Boot for zhaojinghao.com
 * Runs blocking in <head> across the Hub and all 19 Devil's Plan S3 games. */
(function () {
  try {
    if (
      window.location.protocol === 'http:' &&
      (window.location.hostname === 'zhaojinghao.com' ||
        window.location.hostname === 'www.zhaojinghao.com')
    ) {
      window.location.replace(
        'https://' +
          window.location.host +
          window.location.pathname +
          window.location.search +
          window.location.hash
      );
      return;
    }
  } catch (_) {}

  try {
    var saved = localStorage.getItem('dp3_theme');
    var theme =
      saved === 'light' || saved === 'dark'
        ? saved
        : window.matchMedia &&
            window.matchMedia('(prefers-color-scheme: light)').matches
          ? 'light'
          : 'dark';
    document.documentElement.dataset.theme = theme;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'light' ? '#f5f4f0' : '#06070b');
    }
  } catch (_) {
    try {
      document.documentElement.dataset.theme = 'dark';
    } catch (__) {}
  }
})();
