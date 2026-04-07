/**
 * Gulp release pipeline
 *
 * Usage:  pnpm release
 *
 * Steps:
 *   1. Clean previous build/ and release/ directories.
 *   2. Run pnpm build (webpack production build).
 *   3. Generate the translation POT file.
 *   4. Copy production files into build/all-feedback/.
 *   5. Run composer install --no-dev inside the build directory.
 *   6. Zip the build into release/all-feedback.zip.
 *   7. Remove the temporary build/ directory.
 */

import chalk from 'chalk';
import { spawn } from 'child_process';
import { dest, parallel, series, src } from 'gulp';
import zip from 'gulp-zip';
import path from 'path';

const PLUGIN_SLUG = 'all-feedback';
const BUILD_DIR   = `build/${PLUGIN_SLUG}`;

// ── Shell helper ──────────────────────────────────────────────────────

function exec(command) {
    console.log(chalk.cyan(`▶ ${command}`));

    return new Promise((resolve, reject) => {
        const [cmd, ...args] = command.split(' ');
        const child = spawn(cmd, args, { shell: true, stdio: 'pipe' });

        child.stdout.on('data', (d) => console.log(chalk.green(d.toString().trim())));
        child.stderr.on('data', (d) => console.error(chalk.red(d.toString().trim())));

        child.on('close', (code) => {
            if (code === 0) {
                console.log(chalk.green(`✓ ${command}`));
                resolve();
            } else {
                console.error(chalk.red(`✗ Exit ${code}: ${command}`));
                reject(new Error(`Command failed: ${command}`));
            }
        });

        child.on('error', (err) => {
            console.error(chalk.red(`✗ Failed to start: ${command}`));
            reject(err);
        });
    });
}

// ── Files to copy into the release build ─────────────────────────────

const FILES = {
    'src/**/*':                                    `${BUILD_DIR}/src`,
    'config/**/*':                                 `${BUILD_DIR}/config`,
    'database/**/*':                               `${BUILD_DIR}/database`,
    'languages/**/*':                              `${BUILD_DIR}/languages`,
    'resources/build/**/*.{js,css,php}':           `${BUILD_DIR}/resources/build`,
    [`${PLUGIN_SLUG}.php`]:                        BUILD_DIR,
    'uninstall.php':                               BUILD_DIR,
    'readme.txt':                                  BUILD_DIR,
    'composer.json':                               BUILD_DIR,
    'composer.lock':                               BUILD_DIR,
};

const copyTasks = Object.entries(FILES).map(([source, destination]) => {
    const taskName = `copy:${path.basename(source.replace('/**/*', '').replace('/**/*.{js,css,php}', ''))}`;
    const task     = () => src(source, { encoding: false }).pipe(dest(destination));
    task.displayName = taskName;
    return task;
});

// ── Release pipeline ─────────────────────────────────────────────────

export const release = series(
    function clean()    { return exec('rm -rf build/ release/'); },
    function build()    { return exec('pnpm build'); },
    function makePot()  { return exec('pnpm make-pot'); },
    parallel(...copyTasks),
    function composer() {
        return exec(`cd ${BUILD_DIR} && composer install --no-dev --optimize-autoloader`);
    },
    function compress() {
        return src(
            ['./build/**/*', '!./build/**/composer.json', '!./build/**/composer.lock'],
            { encoding: false },
        )
            .pipe(zip(`${PLUGIN_SLUG}.zip`))
            .pipe(dest('./release/'));
    },
    function cleanup()  { return exec('rm -rf build/'); },
);
