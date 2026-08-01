// npm install
// npm-check-updates
// npm run build && git add -A && git commit --amend -m "dev" && git push -f

import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as cache from '@actions/cache';
import * as tc from '@actions/tool-cache';

import process from 'process';
import path from 'path';
import os from 'os';
import fs from 'fs';

function unixify(s) 
{
    return s.split(path.sep).join(path.posix.sep);
}

function is_git_sha(hash) 
{
    return /^[0-9a-f]{7,40}$/i.test(hash)
}

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

        case 'win32':
            return path.join(process.env['RUNNER_TEMP'], 'lazarus');

        case 'darwin':
            return path.join(process.env['RUNNER_TEMP'], 'lazarus');
    }
}

function useCache()
{
    return core.getInput('use-cache').toUpperCase() == 'TRUE';
}

function debugBuild()
{
    return core.getInput('debug-build').toUpperCase() == 'TRUE';
}

function lazURL()
{
    return core.getInput('laz-url').split(/\r?\n/);
}

function fpcURL()
{
    return core.getInput('fpc-url').split(/\r?\n/);
}

function urlTail(url)
{
    // last 3 path segments
    return url.split('/').slice(-3).join('/');
}

function cacheKey()
{
    return [...lazURL(), ...fpcURL()].filter(Boolean).map(urlTail).join('-');
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

    const filename = path.join(installersLocation(), path.basename(url.replace(/\/download\/?$/, '')));

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

async function sourceForge()
{
    try
    {
        await exec.exec('mkdir -p ' + installersLocation());

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
            await install(url, !cacheLoaded);
        }
        for (const url of lazURL())
        {
            await install(url, !cacheLoaded);
        }

        const installed = installedLocation();
        if (installed)
        {
            core.addPath(installed);
        }
    }
    catch (error)
    {
        core.setFailed(error.message);
    }
}

async function runDsymutil(installDir)
{
    const binDir = path.join(installDir, 'fpc', 'bin');
    if (!fs.existsSync(binDir))
    {
        return;
    }

    const compiler = os.arch() === 'arm64' ? 'ppca64' : 'ppcx64';

    for (const target of fs.readdirSync(binDir))
    {
        const file = path.join(binDir, target, compiler);
        if (fs.existsSync(file))
        {
            await exec.exec('dsymutil', [ file ]);
        }
    }
}

async function fpcLazUp()
{
    try
    {
        const lazCommit = core.getInput('fpclazup-lazcommit');
        if (!is_git_sha(lazCommit))
        {
            throw new Error("Laz commit SHA required"); 
        }

        const fpcCommit = core.getInput('fpclazup-fpccommit');
        if (!is_git_sha(fpcCommit))
        {
            throw new Error("FPC commit SHA required"); 
        }
        
        const fpcLazupUrl = core.getInput('fpclazup-url');
        if (!fpcLazupUrl.includes("fpclazup-"))
        {
            throw new Error("Require fpclazup not fpcup (aka only FPC!!)"); 
        }

        const fpcLazupFile = unixify(path.join(process.env['RUNNER_TEMP'], 'fpclazupbin') + (process.platform === 'win32' ? '.exe' : ''));
        const installDir = unixify(path.join(process.env['RUNNER_TEMP'], 'fpclazup') + '/');

        const debug = debugBuild();
        const cacheKey = process.env['ImageOS'] + ' ' + urlTail(fpcLazupUrl) + ' ' + fpcCommit + ' ' + lazCommit + (debug ? ' debug' : '');
        const cacheLoaded = await cache.restoreCache([installDir], cacheKey) != null;
        if (!cacheLoaded)
        {
            await exec.exec('mkdir', [ 
                '-p', 
                installDir
            ]);

            // get fpc
            await exec.exec('git', [ 
                'clone', 
                'https://gitlab.com/freepascal.org/fpc/source', 
                installDir + 'fpc'
            ]);
            await exec.exec('git', [ 
                '-C', 
                installDir + 'fpc', 
                'checkout', 
                fpcCommit
            ]);

            // get lazarus
            await exec.exec('git', [ 
                'clone', 
                'https://gitlab.com/freepascal.org/lazarus/lazarus', 
                installDir + 'lazarus'
            ]);

            await exec.exec('git', [ 
                '-C', 
                installDir + 'lazarus', 
                'checkout', 
                lazCommit
            ]);

            if (!await tc.downloadTool(fpcLazupUrl, fpcLazupFile))
            {
                throw new Error('Failed to download: ' + fpcLazupUrl);
            }

            if (process.platform !== 'win32')
            {
                await exec.exec('chmod', [ 
                    '+x', 
                    fpcLazupFile
                ]);
            }
            
            await exec.exec(fpcLazupFile, [
                '--only=FPCCleanOnly,FPCBuildOnly,LazarusCleanOnly,LazBuild,LazarusConfigOnly',
                debug ? '--fpcOPT=-g -gl -gw2' : '',
                debug ? '--lazOPT=-g -gl -gw2' : '',
                '--noconfirm',
                '--verbose',
                '--installdir=' + installDir
            ].filter(Boolean));

            if (process.platform == 'win32' && !fpcLazupUrl.includes('i386'))
            {
                await exec.exec(fpcLazupFile, [
                    '--only=FPCCleanOnly,FPCBuildOnly',
                    '--ostarget=win32',
                    '--cputarget=i386',
                    '--autotools',
                    debug ? '--fpcOPT=-g -gl -gw2' : '',
                    '--noconfirm',
                    '--verbose',
                    '--installdir=' + installDir
                ].filter(Boolean));
            }

            // generate .dSYM on macOS debug builds
            if (debug && process.platform === 'darwin')
            {
                await runDsymutil(installDir);
            }

            core.exportVariable('SAVE_CACHE_DIR', installDir);
            core.exportVariable('SAVE_CACHE_KEY', cacheKey);
        }
        core.addPath(path.join(installDir, 'lazarus'));
    }
    catch (error)
    {
        core.setFailed(error.message);
    }
}

(async () => {
    try {
        if (os.platform() === 'linux') 
        {
            await exec.exec('sudo apt-get update');
            await exec.exec('sudo apt-get install -y gtk2.0 libgtk2.0-dev libxtst-dev libffi-dev');
        }

        if (core.getInput('fpclazup-url')) {
            core.info("Mode: fpclazup");
            await fpcLazUp();
        } else {
            core.info("Mode: sourceforge");
            await sourceForge();
        }
    } catch (error) {
        core.setFailed(error.message);
    }
})();