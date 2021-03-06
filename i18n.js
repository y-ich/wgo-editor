(function() {
    const fs = require('fs');
    function appLang() {
        window.AppLang = {
            lang: 'en',
            i18n: {},
            t: key => AppLang.i18n[AppLang.lang][key]
        };
        const files = fs.readdirSync('i18n', { encoding: 'utf-8' });
        const langs = files.map(e => e.replace(/^i18n\.|\.js$/g, ''));
        let lang = navigator.language.slice(0, 2);
        if (!langs.includes(lang)) {
            lang = 'en';
        }
        document.write(`<script src="i18n/i18n.${lang}.js"></script>`);
    }
    appLang();
})();
