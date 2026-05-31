import * as core from '@actions/core';
import * as cache from '@actions/cache';
import process from 'process';

async function run() {
    try {
        await cache.saveCache([process.env['SAVE_CACHE_DIR']], process.env['SAVE_CACHE_KEY']);
    } catch (error) {
        console.log(error.message);
    }
}

run();
