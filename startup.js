/* global nw WGo jssgf */
const os = require('os');
const fs = require('fs');
const path = require('path');
process.env.LZ19_WEIGHTS = path.join(process.cwd(), 'elf_converted_weights.txt');
const { GtpLeela, GtpLeelaZero19, GtpLeelaZero9, coord2move } = require('gtp-wrapper');
let player = null;
let gtp = null;
let restore = null;

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
            nw.Window.open('index.html', nw.App.manifest.window);
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
    console.log('foo');
    console.log(lb instanceof Array);
    node.LB = lb;
    node.C = `黒の勝率${Math.round(winrate)}%`;
    player.loadSgf(jssgf.stringify(collection), Infinity);
}

nw.App.on('open', function(evt) {
    console.log(evt);
});

document.getElementById('ai-start').addEventListener('click', function(event) {
    event.currentTarget.style.display = 'none';
    document.getElementById('ai-stop').style.display = 'inline';
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
        SelectedGtpLeela = GtpLeelaZero9;
        break;
        case 19:
        SelectedGtpLeela = GtpLeelaZero19;
        break;
        default:
        SelectedGtpLeela = GtpLeela;
    }
    const options = ['--threads', os.cpus().length];

    if (SelectedGtpLeela === GtpLeela) {
        options.push('--nobook');
        if (rule === 'Japanese') {
            options.push('--komiadjust');
        }
    }
    const { instance, _ } = SelectedGtpLeela.genmoveFrom(sgf, BYOYOMI, 'gtp', options, 0, line => {
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
}, false);

document.getElementById('ai-stop').addEventListener('click', async function() {
    event.currentTarget.style.display = 'none';
    document.getElementById('ai-start').style.display = 'inline';
    if (gtp) {
        await gtp.terminate();
        gtp = null;
    }
    if (restore) {
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
}

main();
