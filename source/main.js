const core = require('@actions/core');
const exec = require("@actions/exec");
const cache = require('@actions/cache');
const process = require('process');
const path = require('path');
const os = require('os');
const fs = require('fs');
const base64 = require('base-64');

const cache_key = base64.encode(core.getInput('laz-url') + core.getInput('fpc-url'))
const installer_dir = path.join(process.env['RUNNER_TEMP'], 'installers')

async function restore_installers() {

    await exec.exec('mkdir -p ' + installer_dir);
    await cache.restoreCache([installer_dir], cache_key) != null;
}

async function check_installer(filename) {

    if (fs.existsSync(filename) && (fs.statSync(filename).size == 0)) {
        fs.unlinkSync(filename);
    }

    return fs.existsSync(filename);
}

async function download_installer(url) {

    filename = path.join(installer_dir, path.basename(url));

    if (await check_installer(filename) == false) {
        await exec.exec('curl --progress-bar -L -o "' + filename + '" ' + url);

        if (await check_installer(filename)) {
            core.exportVariable('SAVE_CACHE_DIR', installer_dir);
            core.exportVariable('SAVE_CACHE_KEY', cache_key);
        }
    }

    return filename;
}

async function install_macos(file) {

    function checkmount(file) {
        return (file.toLowerCase().startsWith('lazarus') || file.toLowerCase().startsWith('fpc'))
    }

    function checkpkg(file) {
        return (file.toLowerCase().startsWith('lazarus') || file.toLowerCase().startsWith('fpc')) && (file.endsWith('.pkg') || file.endsWith('.mpkg'))
    }

    switch (path.extname(file)) {
        case '.dmg':
            await exec.exec('sudo hdiutil attach ' + file);

            var mounts = fs.readdirSync('/Volumes/').filter(checkmount);
            for (const mount of mounts) {
                var pkgs = fs.readdirSync('/Volumes/' + mount).filter(checkpkg);
                for (const pkg of pkgs) {
                    await exec.exec('sudo installer -package "' + path.join('/Volumes/', mount, pkg) + '" -target /');
                }
            }
			
			for (const mount of mounts) {
				await exec.exec('sudo hdiutil detach /Volumes/' + mount);			
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

    if (url == '') {
        return
    }

    filename = await download_installer(url);

    switch (os.platform()) {
        case 'linux':
            await install_linux(filename);
            break;

        case 'win32':
            await install_windows(filename);
            break;

        case 'darwin':
            await install_macos(filename);
            break;
    }
}

async function run() {

    try {
        if (os.platform() == 'linux') {
            await exec.exec('sudo apt-get update');
        }

        await restore_installers()

        for (const url of core.getInput('fpc-url').split(os.EOL)) {
            await install(url);
        }
        for (const url of core.getInput('laz-url').split(os.EOL)) {
            await install(url);
        }

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
