(function() {
// 大域変数

var player = null;

// 関数

var saveCurrentSgf = function(player, filePath) {
	if (typeof(nw) != 'undefined' && filePath != '') {
		var fs = nw.require('fs');
		fs.writeFile(filePath, player.kifu.toSgf(), (err) => {
			if (err) throw err;
			player.kifu._edited = false;
		});
	}
}

var setupFileInput = function() {
    var fileInput = document.createElement('input');
    fileInput.id = 'file-input';
    fileInput.type = 'file';
    fileInput.accept = '.sgf';
    fileInput.addEventListener('change', function(evt) {
        if (!this.nwsaveas) {
            var reader = new FileReader();
            reader.onload = function(evt) {
                player.loadSgf(evt.target.result);
            }
            reader.readAsText(this.files[0]);
        } else {
            saveCurrentSgf(player, fileInput.value);
        }
    }, false);
    return fileInput;
}

var setupMainMenu = function() {
    var fileInput = setupFileInput();
    var menubar = new nw.Menu({type: 'menubar'});
    var fileMenu = new nw.Menu();

    if (process.platform == 'darwin') {
        menubar.createMacBuiltin('WGo');
        menubar.insert(new nw.MenuItem({
            label: 'File',
            submenu: fileMenu
        }), 1);
    }
    else {
        menubar.append(new nw.MenuItem({
            label: WGo.t('file'),
            submenu: fileMenu
        }));
    }

    fileMenu.append(new nw.MenuItem({
        label: WGo.t('new'),
        click: function() {
            var fs = nw.require('fs');
            var manifest = JSON.parse(
                fs.readFileSync('package.json', { encoding: 'utf-8' }));
            nw.Window.open('index.html', manifest.window);
        },
        key: 'n',
        modifiers: 'cmd'
    }));
    fileMenu.append(new nw.MenuItem({
        label: WGo.t('open'),
        click: function() {
            if (player.kifu._edited && !confirm(WGo.t('confirm_abandon'))) {
                return
            }
            delete fileInput.nwsaveas;
            fileInput.click();
        },
        key: 's',
        modifiers: 'cmd'
    }));
    fileMenu.append(new nw.MenuItem({
        label: WGo.t('save'),
        click: function() {
            saveCurrentSgf(player, fileInput.value);
        },
        key: 's',
        modifiers: 'cmd'
    }));
    fileMenu.append(new nw.MenuItem({
        label: WGo.t('saveas'),
        click: function() {
            fileInput.nwsaveas = 'noname.sgf'
            fileInput.click();
        },
        key: 's',
        modifiers: 'cmd+shift'
    }));

    nw.Window.get().menu = menubar;
}

if (typeof(nw) != "undefined")
    setupMainMenu();
player = new WGo.BasicPlayer(document.getElementById("player"), {
    sgf: "(;FF[4]CA[UTF-8]EV[]GN[]GC[]PB[]BR[]PW[]WR[])"
});
})();
