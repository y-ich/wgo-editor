(function() {
if (typeof(nw) != "undefined") {
	var fs = nw.require('fs');

	var manifest = JSON.parse(
		fs.readFileSync('package.json', { encoding: 'utf-8' }));
	nw.App.on('open', function(evt) {
		console.log(evt);
	});
}
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
            label: WGo.t('file'),
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

var sgf = null;

if (typeof(nw) != "undefined") {
	setupMainMenu();
	if (nw.App.argv.length > 0) {
		sgf = fs.readFileSync(nw.App.argv[0]);
	}
}
player = new WGo.BasicPlayer(document.getElementById("player"), {
    sgf: sgf ? sgf : `(;FF[4]GM[1]CA[UTF-8]AP[${manifest.name}:${manifest.version}]EV[]GN[]GC[]PB[]BR[]PW[]WR[])`
});
})();
