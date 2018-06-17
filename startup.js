/* global nw WGo jssgf */
const win = nw.Window.get();
/* for debugging */
win.showDevTools();
/**/
const os = require('os');
const fs = require('fs');
const path = require('path');
process.env.LZ19_WEIGHTS = path.join(process.cwd(), 'elf_converted_weights.txt');
const { GtpLeela, GtpLeelaZero, coord2move } = require('gtp-wrapper');

class GtpLeelaZero19 extends GtpLeelaZero {}
class GtpLeelaZero9 extends GtpLeelaZero {}

let engines = null;
let player = null;
let gtp = null;
let restore = null;

function setEngines() {
    try {
        engines = JSON.parse(fs.readFileSync(
            path.join(nw.App.dataPath, 'engines.json'),
            { encoding: 'utf-8' }
        ));
        if (engines.leela) {
            GtpLeela.init(engines.leela.workDir, engines.leela.command, engines.leela.options);
        }
        if (engines.leelaZero19) {
            GtpLeelaZero19.init(engines.leelaZero19.workDir, engines.leelaZero19.command, engines.leelaZero19.options);
        }
        if (engines.leelaZero9) {
            GtpLeelaZero9.init(engines.leelaZero9.workDir, engines.leelaZero9.command, engines.leelaZero9.options);
        }
    } catch (e) {
        console.log('no engines.json');
    }
}
setEngines();

function openSettings() {
    nw.Window.open('engines.html', { height: 500 }, function(win) {
        win.on('closed', function() {
            setEngines();
        });
    });
}

function sgfUntil(sgf, path) {
    const collection = jssgf.fastParse(sgf);
    let node = collection[0];
    for (let n = 1; n <= path.m; n++) {
        const child = node._children[path[n] || 0];
        node._children = [child];
        node = child;
    }
    node._children = [];
    return jssgf.stringify(collection);
}

function primaryLastNode(root) {
    let num = 0;
    let node = root;
    while (node._children.length > 0) {
        node = node._children[0];
        if (node.B || node.W) {
            num += 1;
        }
    }
    return { num, node };
}

function getTurn(node, root) {
    if (node.B != null) {
        return 'W';
    } else if (node.W != null) {
        return 'B';
    } else if (node === root) {
        if (root.HA && parseInt(root.HA) >= 2) {
            return 'W';
        } else {
            return 'B';
        }
    } else {
        throw new Error('unkonwn');
    }
}

function saveCurrentSgf(player, filePath) {
	if (filePath != '') {
		fs.writeFile(filePath, player.kifuReader.kifu.toSgf(), err => {
			if (err) throw err;
			player.kifu._edited = false;
		});
	}
}

function setupFileInput() {
    const fileInput = document.createElement('input');
    fileInput.id = 'file-input';
    fileInput.type = 'file';
    fileInput.accept = '.sgf';
    fileInput.addEventListener('change', function(evt) {
        if (!this.nwsaveas) {
            const reader = new FileReader();
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

function setupMainMenu() {
    const fileInput = setupFileInput();
    const menubar = new nw.Menu({ type: 'menubar' });
    const fileMenu = new nw.Menu();

    if (process.platform == 'darwin') {
        menubar.createMacBuiltin('WGoEditor');
        menubar.insert(new nw.MenuItem({
            label: AppLang.t('file'),
            submenu: fileMenu
        }), 1);
    }
    else {
        menubar.append(new nw.MenuItem({
            label: AppLang.t('file'),
            submenu: fileMenu
        }));
    }

    fileMenu.append(new nw.MenuItem({
        label: AppLang.t('new'),
        click: function() {
            nw.Window.open('index.html', nw.App.manifest.window);
        },
        key: 'n',
        modifiers: 'cmd'
    }));
    fileMenu.append(new nw.MenuItem({
        label: AppLang.t('open'),
        click: function() {
            if (player.kifu._edited && !confirm(AppLang.t('confirm_abandon'))) {
                return
            }
            delete fileInput.nwsaveas;
            fileInput.click();
        },
        key: 'o',
        modifiers: 'cmd'
    }));
    fileMenu.append(new nw.MenuItem({
        label: AppLang.t('save'),
        click: function() {
            saveCurrentSgf(player, fileInput.value);
        },
        key: 's',
        modifiers: 'cmd'
    }));
    fileMenu.append(new nw.MenuItem({
        label: AppLang.t('saveas'),
        click: function() {
            fileInput.nwsaveas = 'noname.sgf'
            fileInput.click();
        },
        key: 's',
        modifiers: 'cmd+shift'
    }));
    fileMenu.append(new nw.MenuItem({
        label: AppLang.t('settings'),
        click: openSettings
    }));

    nw.Window.get().menu = menubar;
}

function showPV(player, sgf, winrate, pv, nodes) {
    const collection = jssgf.fastParse(sgf);
    const root = collection[0];
    let node = jssgf.nthMoveNode(root, Infinity);
    let color = node.B ? 'W' : 'B';
    const fg = {
        FG: '259:',
        MN: '1',
        _children: []
    };
    node._children.push(fg);
    node = fg;
    let num = 1;
    const lb = [];
    for (let e of pv) {
        const n = {
            [color]: e,
            _children: []
        };
        node._children.push(n);
        lb.push(`${e}:${num}`);
        node = n;
        num += 1;
        color = jssgf.opponentOf(color);
    }
    node.LB = lb;
    node.C = `${AppLang.t('black-winrate')} ${Math.round(winrate)}%\n(${AppLang.t('playouts')} ${nodes})`;
    player.setFrozen(false);
    player.loadSgf(jssgf.stringify(collection), Infinity);
    player.setFrozen(true);
}

nw.App.on('open', function(evt) {
    console.log(evt);
});

document.getElementById('ai-start').addEventListener('click', function(event) {
    if (!engines) {
        openSettings();
        return;
    }
    event.currentTarget.style.display = 'none';
    document.getElementById('ai-stop').style.display = 'inline';
    player.setFrozen(true);
    const BYOYOMI = 57600; // 16時間(5時封じ手から翌朝9時を想定)。free dynoの場合40分程度でmemory quota exceededになる
    restore = {
        sgf: player.kifuReader.kifu.toSgf(),
        path: player.kifuReader.path
    };
    const sgf = sgfUntil(restore.sgf, restore.path);
    const [root] = jssgf.fastParse(sgf);
    const size = parseInt(root.SZ || '19');
    const rule = root.RU || (root.KM === '7.5' ? 'Chinese' : 'Japanese');
    const { num, node } = primaryLastNode(root);
    const turn = getTurn(node, root);
    let SelectedGtpLeela;
    switch (size) {
        case 9:
        SelectedGtpLeela = engines.leelaZero9 ? GtpLeelaZero9 : GtpLeela;
        break;
        case 19:
        SelectedGtpLeela = engines.leelaZero19 ? GtpLeelaZero19 : GtpLeela;
        break;
        default:
        SelectedGtpLeela = GtpLeela;
    }
    const { instance, promise } = SelectedGtpLeela.genmoveFrom(sgf, BYOYOMI, 'gtp', [], 0, line => {
        const dump = SelectedGtpLeela.parseDump(line);
        if (dump) {
            const winrate = Math.max(Math.min(dump.winrate, 100), 0);
            const blackWinrate = turn === 'B' ? winrate : 100 - winrate;
            const pv = dump.pv.map(c => coord2move(c, size));
            showPV(player, sgf, blackWinrate, pv, dump.nodes);
        } else {
            console.log('stderr: %s', line);
        }
    });
    gtp = instance;
    promise.catch(function(r) {
        console.log(r);
    });
}, false);

document.getElementById('ai-stop').addEventListener('click', async function() {
    event.currentTarget.style.display = 'none';
    document.getElementById('ai-start').style.display = 'inline';
    if (gtp) {
        await gtp.terminate();
        gtp = null;
    }
    if (restore) {
        player.setFrozen(false);
        player.loadSgf(restore.sgf, restore.path);
        restore = null;
    }
}, false);

function main() {
    let sgf = null;

    setupMainMenu();
    if (nw.App.argv.length > 0) {
        sgf = fs.readFileSync(nw.App.argv[0]);
    }
    player = new WGo.BasicPlayer(document.getElementById("player"), {
        sgf: sgf ? sgf : `(;FF[4]GM[1]CA[UTF-8]AP[${nw.App.manifest.name}:${nw.App.manifest.version}]EV[]GN[]GC[]PB[]BR[]PW[]WR[])`
    });
    win.on('close', function(event) {
        if (player.kifu._edited && !confirm(AppLang.t('confirm_close'))) {
            return;
        }
        win.close(true);
    });
}

main();
