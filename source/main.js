const core = require('@actions/core');
const exec = require("@actions/exec");
const tc = require('@actions/tool-cache');
const process = require('process');
const path = require('path');
const os = require('os');
const fs = require('fs');

async function install_macos(file) {

    switch (path.extname(file)) {
        case '.dmg':
            await exec.exec('sudo hdiutil attach ' + file);

            mountpoint = path.join('/Volumes/', path.basename(file, '.dmg'));
            files = fs.readdirSync(mountpoint);
            for (const file of files) {
                if (path.extname(file) == '.pkg') {
                    await exec.exec('sudo installer -package ' + path.join(mountpoint, file) + ' -target /');
                }
            }
            break;

        case '.pkg':
            await exec.exec('sudo installer -package ' + file + ' -target /');
            break;
    }
}

async function install_linux(file) {

    await exec.exec('sudo apt install -y ' + file);
}

async function install_windows(file) {

    await exec.exec(file + ' /VERYSILENT /DIR=' + path.join(process.env['RUNNER_TEMP'], 'lazarus'));
}

async function install(url) {

    console.log('Installing: ', url);

    file = await tc.downloadTool(url, path.join(process.env['RUNNER_TEMP'], path.basename(url)));

    switch (os.platform()) {
        case 'linux':
            await install_linux(file);
            break;

        case 'win32':
            await install_windows(file);
            break;

        case 'darwin':
            await install_macos(file);
            break;
    }
}

async function run() {

    try {
   		if (process.platform == 'linux') {
            await exec.exec('sudo apt-get update');
        } 
    
        for (const url of core.getInput('fpc-url').split(os.EOL).filter(Boolean)) {
            await install(url);
        }
        await install(core.getInput('laz-url'));

        // Add to system path
        switch (os.platform()) {
            case 'win32':
                core.addPath(path.join(process.env['RUNNER_TEMP'], 'lazarus'));
                break;

            case 'darwin':
                core.addPath('/Applications/Lazarus');
                break;
        }

    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
