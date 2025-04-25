// npm install
// npm-check-updates
// npm run build && git add -A && git commit --amend -m "dev" && git push -f

const core = require('@actions/core');
const exec = require("@actions/exec");
const cache = require('@actions/cache');
const process = require('process');
const path = require('path');
const os = require('os');
const fs = require('fs');
const base64 = require('base-64');
const tc = require('@actions/tool-cache');

function installersLocation()
{
    return path.join(process.env['RUNNER_TEMP'], 'installers');
}

function installedLocation()
{
    switch (os.platform())
    {
        case 'linux':
            return '';
            break;

        case 'win32':
            return path.join(process.env['RUNNER_TEMP'], 'lazarus');
            break;

        case 'darwin':
            return path.join(process.env['RUNNER_TEMP'], 'lazarus');
            break;
    }
}

function useCache()
{
    return core.getInput('use-cache').toUpperCase() == 'TRUE';
}

function lazURL()
{
    return core.getInput('laz-url').split(os.EOL);
}

function fpcURL()
{
    return core.getInput('fpc-url').split(os.EOL);
}

function cacheKey()
{
    return base64.encode(core.getInput('laz-url') + '-' + core.getInput('fpc-url'));
}

async function install_macos(file)
{
    function checkmount(file)
    {
        return (file.toLowerCase().startsWith('lazarus') || file.toLowerCase().startsWith('fpc'))
    }

    function checkpkg(file)
    {
        return (file.toLowerCase().startsWith('lazarus') || file.toLowerCase().startsWith('fpc')) && (file.endsWith('.pkg') || file.endsWith('.mpkg'))
    }

    switch (path.extname(file))
    {
        case '.dmg':
            await exec.exec('sudo hdiutil attach ' + file);

            var mounts = fs.readdirSync('/Volumes/').filter(checkmount);
            for (const mount of mounts)
            {
                var pkgs = fs.readdirSync('/Volumes/' + mount).filter(checkpkg);
                for (const pkg of pkgs)
                {
                    await exec.exec('sudo installer -package "' + path.join('/Volumes/', mount, pkg) + '" -target /');
                }
            }

            for (const mount of mounts)
            {
                await exec.exec('sudo hdiutil detach /Volumes/' + mount);
            }
            break;

        case '.pkg':
            await exec.exec('sudo installer -package ' + file + ' -target /');
            break;

        case '.zip':
            await exec.exec('xattr -cr "' + file + '"');
            await exec.exec('unzip -q "' + file + '" -d ' + process.env['RUNNER_TEMP']);

            // update lazarus directory in config
            var configFile = installedLocation() + '/config/environmentoptions.xml'
            fs.writeFileSync(
                configFile,
                fs.readFileSync(configFile, { encoding: 'utf8', flag: 'r'}).replace('"/Developer/lazarus/"', '"' + installedLocation() + '"'),
                { encoding: 'utf8', flag: 'w' }
            );
            break;
    }
}

async function install_linux(file)
{
    await exec.exec('sudo apt install -y ' + file);
}


async function install_windows(file)
{
    await exec.exec(file + ' /VERYSILENT /DIR=' + installedLocation());
}

async function install(url, download)
{
    if (url == '')
    {
        return
    }

    filename = path.join(installersLocation(), path.basename(url));

    if (download)
    {
        if (!await tc.downloadTool(url, filename))
        {
            throw new Error('Failed to download: ' + url);
        }
    }

    switch (os.platform())
    {
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

async function run()
{
    try
    {
        await exec.exec('mkdir -p ' + installersLocation());

        if (os.platform() == 'linux')
        {
            await exec.exec('sudo apt-get update');
        }

        var cacheLoaded = false;
        if (useCache())
        {
            cacheLoaded = await cache.restoreCache([installersLocation()], cacheKey()) != null;
            if (!cacheLoaded)
            {
                core.exportVariable('SAVE_CACHE_DIR', installersLocation());
                core.exportVariable('SAVE_CACHE_KEY', cacheKey());
            }
        }

        for (const url of fpcURL())
        {
            await install(url, cacheLoaded == false);
        }
        for (const url of lazURL())
        {
            await install(url, cacheLoaded == false);
        }

        core.addPath(installedLocation());
    }
    catch (error)
    {
        core.setFailed(error.message);
    }
}

run();
