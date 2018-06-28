/* global nw WGo jssgf AppLang */
const win = nw.Window.get();
// win.showDevTools();
const fs = require('fs');
const path = require('path');
// const jssgf = require('jssgf'); // なぜかnpmのjssgfはstringifyの引数の中の配列がプレインオブジェクトになってしまう
const AutoUpdater = require("nw-autoupdater");
const { GtpLeela, GtpLeelaZero, coord2move } = require('gtp-wrapper');
const { fileToCovertedString, xyz2sgf, getExtension } = require('xyz2sgf');

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
        if (engines.leela && engines.leela.command) {
            GtpLeela.init(engines.leela.workDir, engines.leela.command, engines.leela.options);
        }
        if (engines.leelaZero19 && engines.leelaZero19.command) {
            GtpLeelaZero19.init(engines.leelaZero19.workDir, engines.leelaZero19.command, engines.leelaZero19.options);
        }
        if (engines.leelaZero9 && engines.leelaZero9.command) {
            GtpLeelaZero9.init(engines.leelaZero9.workDir, engines.leelaZero9.command, engines.leelaZero9.options);
        }
    } catch (e) {
        console.log('no engines.json');
        console.error(e);
    }
}
setEngines();

function openSettings() {
    nw.Window.open(`engines.${AppLang.lang}.html`, { height: 500 }, function(win) {
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
    fileInput.accept = '.sgf,.gib,.ngf,.ugf,.ugi';
    fileInput.addEventListener('change', function(evt) {
        if (!this.nwsaveas) {
            win.title = fileInput.value;
            document.title = fileInput.value;
            const reader = new FileReader();
            reader.onload = async evt => {
                const sgf = /\.sgf$/.test(this.files[0].name) ?
                    evt.target.result :
                    await xyz2sgf(evt.target.result, getExtension(this.files[0].name));
                player.loadSgf(sgf);
            }
            reader.readAsText(this.files[0]);
        } else {
            saveCurrentSgf(player, fileInput.value);
        }
    }, false);
    return fileInput;
}

function setupMainMenu() {
    const menubar = new nw.Menu({ type: 'menubar' });
    const fileMenu = new nw.Menu();

    if (process.platform == 'darwin') {
        menubar.createMacBuiltin('wgo-editor');
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
            const fileInput = setupFileInput();
            fileInput.click();
        },
        key: 'o',
        modifiers: 'cmd'
    }));
    fileMenu.append(new nw.MenuItem({
        label: AppLang.t('save'),
        click: function() {
            if (getExtension(document.title) === '.sgf') {
                saveCurrentSgf(player, document.title);
            } else {
                const fileInput = setupFileInput();
                fileInput.nwsaveas = document.title.replace(/.*\//, '').replace(/\.\w+$/, '.sgf');
                fileInput.click();
            }
        },
        key: 's',
        modifiers: 'cmd'
    }));
    fileMenu.append(new nw.MenuItem({
        label: AppLang.t('saveas'),
        click: function() {
            const fileInput = setupFileInput();
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

    const devMenu = new nw.Menu();
    menubar.append(new nw.MenuItem({
        label: AppLang.t('develop'),
        submenu: devMenu
    }));
    devMenu.append(new nw.MenuItem({
        label: AppLang.t('devtools'),
        click: function() {
            win.showDevTools();
        }
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
    for (let e of pv) {
        const n = {
            [color]: e,
            _children: []
        };
        node._children.push(n);
        node = n;
        color = jssgf.opponentOf(color);
    }
    node.C = `${AppLang.t('black-winrate')} ${Math.round(winrate)}%\n(${AppLang.t('playouts')} ${nodes})`;
    player.setFrozen(false);
    player.config.displayMoveNumbers = true;
    player.loadSgf(jssgf.stringify(collection), Infinity);
    player.setFrozen(true);
}

function copyBoard(player) {
    const board = player.board;
    const canvas = document.createElement('canvas');
    const width = parseFloat(board.element.style.width);
    const height = parseFloat(board.element.style.height);
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const backgroundImage = document.createElement('img');
    backgroundImage.width = width;
    backgroundImage.height = height;
    backgroundImage.src = player.board.background;
    ctx.drawImage(backgroundImage, 0, 0);
    ctx.drawImage(board.grid.element, 0, 0);
    for (const c of board.shadow.elements) {
        ctx.drawImage(c, 0, 0);
    }
    for (const c of board.stone.elements) {
        ctx.drawImage(c, 0, 0);
    }

    const clip = nw.Clipboard.get();
    clip.set(canvas.toDataURL(), 'png');
}


async function autoUpdate() {
    const rp = require('request-promise-native');
    const updater = new AutoUpdater(
        require("./package.json"),
        { strategy: "ScriptSwap" }
    );
    // Download/unpack update if any available
    //const rManifest = await updater.readRemoteManifest(); // Githubはcontent-typeにjsonを返さないのでエラーになる
    const rManifest = JSON.parse(await rp({ url: nw.App.manifest.manifestUrl }));
    const needsUpdate = await updater.checkNewVersion(rManifest);
    if (!needsUpdate) {
        return false;
    }
    if (!confirm(AppLang.t('new-release'))) {
        return false;
    }
    const dom = document.getElementById('update');
    dom.style.display = 'block';
    // Subscribe for progress events
    updater.on("download", (downloadSize, totalSize) => {
        dom.innerText = `Downloading...(${downloadSize}/${totalSize})`;
    });
    updater.on("install", (installFiles, totalFiles) => {
        dom.innerText = `Installing...(${installFiles}/${totalFiles})`;
    });
    const updateFile = await updater.download(rManifest);
    await updater.unpack(updateFile);
    alert(AppLang.t('updating'));
    await updater.restartToSwap();
    return true;
}

async function main() {
    autoUpdate().catch(function(r) {
        console.error(r);
        const dom = document.getElementById('update');
        dom.innerText = r.toString();
    });
    let sgf = null;

    setupMainMenu();
    if (nw.App.argv.length > 0) {
        win.title = nw.App.argv[0];
        document.title = nw.App.argv[0];
        if (/\.sgf$/.test(nw.App.argv[0])) {
            sgf = fs.readFileSync(nw.App.argv[0], { encoding: 'utf-8' });
        } else {
            sgf = await fileToCovertedString(nw.App.argv[0]);
        }
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


document.addEventListener('copy', function(event) {
    event.preventDefault();
    copyBoard(player);
}, false);

document.getElementById('ai-start').addEventListener('click', function(event) {
    if (!engines) {
        openSettings();
        return;
    }
    event.currentTarget.style.display = 'none';
    player.setFrozen(true);
    const BYOYOMI = 57600; // 16時間(5時封じ手から翌朝9時を想定)。free dynoの場合40分程度でmemory quota exceededになる
    restore = {
        sgf: player.kifuReader.kifu.toSgf(),
        displayMoveNumbers: player.config.displayMoveNumbers,
        path: player.kifuReader.path,
        _edited: player.kifu._edited
    };
    const sgf = sgfUntil(restore.sgf, restore.path);
    const [root] = jssgf.fastParse(sgf);
    const size = parseInt(root.SZ || '19');
    const rule = root.RU || (root.KM === '7.5' ? 'Chinese' : 'Japanese');
    const { num, node } = primaryLastNode(root);
    const turn = getTurn(node, root);
    let SelectedGtpLeela;
    let LeelaName = '';
    switch (size) {
        case 9:
        SelectedGtpLeela = engines.leelaZero9 ? GtpLeelaZero9 : GtpLeela;
        LeelaName = 'Leela Zero 9'
        break;
        case 19:
        SelectedGtpLeela = engines.leelaZero19 ? GtpLeelaZero19 : GtpLeela;
        LeelaName = 'Leela Zero 19'
        break;
        default:
        SelectedGtpLeela = GtpLeela;
        LeelaName = 'Leela'
    }
    player.showMessage(AppLang.t('starting')(LeelaName), undefined, true);
    const { instance, promise } = SelectedGtpLeela.genmoveFrom(sgf, BYOYOMI, 'gtp', [], 0, line => {
        const dump = SelectedGtpLeela.parseDump(line);
        if (dump) {
            player.hideMessage();
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
    document.getElementById('ai-stop').style.display = 'inline';
}, false);

document.getElementById('ai-stop').addEventListener('click', async function() {
    player.hideMessage();
    event.currentTarget.style.display = 'none';
    if (gtp) {
        await gtp.terminate();
        gtp = null;
    }
    if (restore) {
        player.setFrozen(false);
        player.config.displayMoveNumbers = restore.displayMoveNumbers;
        player.loadSgf(restore.sgf, restore.path);
        player.kifu._edited = restore._edited;
        restore = null;
    }
    document.getElementById('ai-start').style.display = 'inline';
}, false);

main();
