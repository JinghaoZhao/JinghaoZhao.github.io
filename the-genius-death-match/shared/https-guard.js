/* Synchronous Secure Context guard for production HTTPS domains.
 * WebRTC, navigator.clipboard, and crypto.subtle require HTTPS outside localhost. */
(function () {
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
