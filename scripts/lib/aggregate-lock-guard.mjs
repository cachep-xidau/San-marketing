/**
 * Lock guard for preventing concurrent aggregate rebuilds.
 */

import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const LOCK_FILE = join(tmpdir(), 'marketing-aggregates-rebuild.lock');
const LOCK_MAX_AGE = 2 * 60 * 60 * 1000; // 2 hours

/**
 * Acquire lock or exit if already held.
 */
export function acquireLock() {
    if (existsSync(LOCK_FILE)) {
        try {
            const lockContent = readFileSync(LOCK_FILE, 'utf-8');
            const lockAge = Date.now() - parseInt(lockContent);

            if (lockAge < LOCK_MAX_AGE) {
                console.error('Lock file exists. Another rebuild may be in progress.');
                console.error(`Lock file: ${LOCK_FILE}`);
                console.error('If you believe this is stale, manually delete the lock file.');
                process.exit(1);
            } else {
                console.warn('Stale lock file found, removing...');
                unlinkSync(LOCK_FILE);
            }
        } catch (e) {
            console.warn('Failed to read lock file, removing...');
            unlinkSync(LOCK_FILE);
        }
    }

    writeFileSync(LOCK_FILE, Date.now().toString());
}

/**
 * Release lock after completion.
 */
export function releaseLock() {
    try {
        if (existsSync(LOCK_FILE)) {
            unlinkSync(LOCK_FILE);
        }
    } catch (e) {
        console.warn('Failed to release lock:', e.message);
    }
}

/**
 * Ensure lock is released on process exit.
 */
export function setupLockCleanup() {
    process.on('exit', releaseLock);
    process.on('SIGINT', () => {
        releaseLock();
        process.exit(0);
    });
    process.on('SIGTERM', () => {
        releaseLock();
        process.exit(0);
    });
}
