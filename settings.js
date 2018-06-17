const fs = require('fs');
const path = require('path');
const win = nw.Window.get();
//win.showDevTools();

function restoreSettings() {
    try {
        engines = JSON.parse(fs.readFileSync(
            path.join(nw.App.dataPath, 'engines.json'),
            { encoding: 'utf-8' }
        ));
        const form = document.getElementById('settings');
        if (engines.leela) {
            if (engines.leela.workDir) {
                form['leela-work-dir'].value = engines.leela.workDir;
            }
            if (engines.leela.command) {
                engines.leela.options.unshift(engines.leela.command);
                form['leela-command'].value = engines.leela.options.join(' ');
            }
        }
        if (engines.leelaZero19) {
            if (engines.leelaZero19.workDir) {
                form['leela-zero-19-work-dir'].value = engines.leelaZero19.workDir;
            }
            if (engines.leelaZero19.command) {
                engines.leelaZero19.options.unshift(engines.leelaZero19.command);
                form['leela-zero-19-command'].value = engines.leelaZero19.options.join(' ');
            }
        }
        if (engines.leelaZero9) {
            if (engines.leelaZero9.workDir) {
                form['leela-zero-9-work-dir'].value = engines.leelaZero9.workDir;
            }
            if (engines.leelaZero9.command) {
                engines.leelaZero9.options.unshift(engines.leelaZero9.command);
                form['leela-zero-9-command'].value = engines.leelaZero9.options.join(' ');
            }
        }
    } catch (e) {
        console.log('no engines.json');
    }
}

restoreSettings();

document.getElementById('settings').addEventListener('submit', function(event) {
    event.preventDefault();
    const engines = {};
    if (event.currentTarget['leela-work-dir'].value !== '') {
        engines.leela = engines.leela || {};
        engines.leela.workDir = event.currentTarget['leela-work-dir'].value;
    }
    if (event.currentTarget['leela-command'].value !== '') {
        engines.leela = engines.leela || {};
        const tokens = event.currentTarget['leela-command'].value.split(/\s+/)
        engines.leela.command = tokens.shift();
        engines.leela.options = tokens;
    }
    if (event.currentTarget['leela-zero-19-work-dir'].value !== '') {
        engines.leelaZero19 = engines.leelaZero19 || {};
        engines.leelaZero19.workDir = event.currentTarget['leela-zero-19-work-dir'].value;
    }
    if (event.currentTarget['leela-zero-19-command'].value !== '') {
        engines.leelaZero19 = engines.leelaZero19 || {};
        const tokens = event.currentTarget['leela-zero-19-command'].value.split(/\s+/)
        engines.leelaZero19.command = tokens.shift();
        engines.leelaZero19.options = tokens;
    }
    if (event.currentTarget['leela-zero-9-work-dir'].value !== '') {
        engines.leelaZero9 = engines.leelaZero9 || {};
        engines.leelaZero9.workDir = event.currentTarget['leela-zero-9-work-dir'].value;
    }
    if (event.currentTarget['leela-zero-9-command'].value !== '') {
        engines.leelaZero9 = engines.leelaZero9 || {};
        const tokens = event.currentTarget['leela-zero-9-command'].value.split(/\s+/)
        engines.leelaZero9.command = tokens.shift();
        engines.leelaZero9.options = tokens;
    }
    fs.writeFileSync(
        path.join(nw.App.dataPath, 'engines.json'),
        JSON.stringify(engines)
    );
    win.close();
}, false);