(function() {
    if (typeof(nw) == 'undefined')
        return

    var fs = nw.require('fs');
    var files = fs.readdirSync('i18n');
    var langs = files.map((e) => { e.replace(/^i18n\.|\.js$/g, '') })
    var lang = navigator.language.slice(0, 2);
    if (!(lang in langs)) {
        lang = 'en';
    }
    document.write(`<script src="wgo/i18n/i18n.${lang}.js"></script>`);
})();
