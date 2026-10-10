/**
 * Simple i18n loader
 */
(function(){
  const I18N = {
    lang: 'en',
    dicts: { en: {}, ja: {} },
    async init(lang) {
      try {
        this.lang = lang || localStorage.getItem('lang') || 'en';
        // Load base EN
        const enRes = await fetch(`/static/locales/en.json`);
        if (enRes.ok) this.dicts.en = await enRes.json();
        // Load JA as supplemental
        const jaRes = await fetch(`/static/locales/ja.json`);
        if (jaRes.ok) this.dicts.ja = await jaRes.json();
      } catch (e) {
        console.warn('i18n load failed', e);
      }
      window.I18N = this;
      return this;
    },
    t(key, fallback, langOverride) {
      const lang = langOverride || this.lang || 'en';
      const dict = this.dicts[lang] || {};
      if (!key) return fallback || '';
      const val = this._get(dict, key);
      return (typeof val === 'string') ? val : (fallback || key);
    },
    tJa(key, fallback) { return this.t(key, fallback, 'ja'); },
    _get(obj, path) {
      const parts = path.split('.');
      let cur = obj;
      for (const p of parts) {
        if (!cur || !Object.prototype.hasOwnProperty.call(cur, p)) return undefined;
        cur = cur[p];
      }
      return cur;
    }
  };
  I18N.init();
})();
