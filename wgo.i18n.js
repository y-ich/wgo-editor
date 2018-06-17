(function() {
    const fs = require('fs');
    function wgoLang() {
        const files = fs.readdirSync('wgo/i18n', { encoding: 'utf-8' });
        const langs = files.map(e => e.replace(/^i18n\.|\.js$/g, ''));
        let lang = navigator.language.slice(0, 2);
        if (!langs.includes(lang)) {
            lang = 'en';
        }
        document.write(`<script src="wgo/i18n/i18n.${lang}.js"></script>`);
    }
    wgoLang();
})();
