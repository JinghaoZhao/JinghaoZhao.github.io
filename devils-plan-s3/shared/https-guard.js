/* Synchronous Secure Context guard for zhaojinghao.com (GitHub Pages CNAME).
 * WebRTC, navigator.clipboard, and crypto.subtle require HTTPS in production. */
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
    }
  } catch (_) {}
})();
