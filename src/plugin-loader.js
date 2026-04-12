/**
 * @module plugin-loader
 * @description Dynamic animation plugin discovery and loading.
 *
 * For script-tag (IIFE) usage: loads plugin JS files dynamically via
 * <script> injection. Fetches an optional manifest of community/custom
 * plugin URLs and loads them sequentially.
 *
 * For ESM usage: plugins are imported directly, so this module is
 * typically not needed. It's provided for compatibility with legacy
 * setups and CDN-based plugin discovery.
 *
 * Fires a custom event ('toto-fx:plugins-ready') when all plugins are loaded.
 */

const _loaded = [];
const _failed = [];
let _ready = false;
let _totalExpected = 0;
let _totalDone = 0;

/**
 * Load a list of script URLs (preserving order).
 * @param {string[]} urls
 * @returns {Promise<void>}
 */
function _loadScripts(urls) {
  if (urls.length === 0) return Promise.resolve();

  return new Promise(function (resolve) {
    let remaining = urls.length;
    _totalExpected += urls.length;

    urls.forEach(function (src) {
      const s = document.createElement('script');
      s.src = src;
      s.onload = function () {
        _loaded.push(src);
        _totalDone++;
        remaining--;
        if (remaining === 0) resolve();
      };
      s.onerror = function () {
        console.warn('[TotoFX PluginLoader] Failed to load: ' + src);
        _failed.push(src);
        _totalDone++;
        remaining--;
        if (remaining === 0) resolve();
      };
      document.head.appendChild(s);
    });
  });
}

export const PluginLoader = {
  /**
   * Load built-in animation scripts and then any dynamic plugins.
   *
   * @param {string[]} builtins - URLs of built-in animation scripts
   * @param {Object} [opts]
   * @param {string} [opts.manifestUrl] - URL to plugin manifest JSON
   * @param {Function} [opts.onReady] - Called when all plugins are loaded
   * @returns {Promise<void>}
   */
  load: function (builtins, opts) {
    opts = opts || {};
    const manifestUrl = opts.manifestUrl || null;
    const onReady = opts.onReady || null;

    return _loadScripts(builtins || [])
      .then(function () {
        if (!manifestUrl) return;
        return fetch(manifestUrl)
          .then(function (r) { return r.json(); })
          .then(function (manifest) {
            const scripts = manifest.plugins || [];
            if (scripts.length === 0) return;
            return _loadScripts(scripts);
          })
          .catch(function (err) {
            console.warn('[TotoFX PluginLoader] Manifest fetch failed:', err);
          });
      })
      .then(function () {
        _ready = true;
        if (onReady) onReady();
        if (typeof document !== 'undefined') {
          document.dispatchEvent(new CustomEvent('toto-fx:plugins-ready'));
        }
      })
      .catch(function (err) {
        console.error('[TotoFX PluginLoader] Fatal error:', err);
        _ready = true;
        if (onReady) onReady();
        if (typeof document !== 'undefined') {
          document.dispatchEvent(new CustomEvent('toto-fx:plugins-ready'));
        }
      });
  },

  /** @returns {boolean} */
  isReady: function () { return _ready; },

  /** @returns {string[]} */
  getLoaded: function () { return _loaded.slice(); },

  /** @returns {string[]} */
  getFailed: function () { return _failed.slice(); },

  /** @returns {{loaded: number, failed: number, total: number}} */
  getStats: function () {
    return { loaded: _loaded.length, failed: _failed.length, total: _totalExpected };
  },
};

export default PluginLoader;
