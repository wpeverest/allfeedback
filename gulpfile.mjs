import chalk from 'chalk';
import { spawn } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { dest, parallel, series, src } from 'gulp';
import zip from 'gulp-zip';
import os from 'os';
import path from 'path';

const PLUGIN_SLUG = 'all-feedback';
const BUILD_DIR   = `build/${PLUGIN_SLUG}`;

function resolveLocalWpPhpBin() {
    const base = path.join(os.homedir(), 'Library', 'Application Support', 'Local', 'lightning-services');
    if (!existsSync(base)) return null;

    const bin = readdirSync(base)
        .filter((d) => /^php-8\.[2-9]/.test(d))
        .sort()
        .reverse()
        .map((d) => path.join(base, d, 'bin', 'darwin-arm64', 'bin'))
        .find((b) => existsSync(path.join(b, 'php')));

    return bin ?? null;
}

const localWpPhpBin = resolveLocalWpPhpBin();
const spawnEnv = localWpPhpBin
    ? { ...process.env, PATH: `${localWpPhpBin}:${process.env.PATH}` }
    : process.env;

if (localWpPhpBin) {
    console.log(chalk.dim(`Using LocalWP PHP: ${localWpPhpBin}`));
}

function exec(command, env = spawnEnv) {
    console.log(chalk.cyan(`▶ ${command}`));

    return new Promise((resolve, reject) => {
        const [cmd, ...args] = command.split(' ');
        const child = spawn(cmd, args, { shell: true, stdio: 'pipe', env });

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

const FILES = {
    'src/**/*':        `${BUILD_DIR}/src`,
    'config/**/*':     `${BUILD_DIR}/config`,
    'database/**/*':   `${BUILD_DIR}/database`,
    'languages/**/*':  `${BUILD_DIR}/languages`,
    'resources/scripts/blocks/**/block.json': `${BUILD_DIR}/resources/scripts/blocks`,
    [`${PLUGIN_SLUG}.php`]: BUILD_DIR,
    'uninstall.php':   BUILD_DIR,
    'readme.txt':      BUILD_DIR,
    'composer.json':   BUILD_DIR,
    'composer.lock':   BUILD_DIR,
};

const copyTasks = Object.entries(FILES).map(([source, destination]) => {
    const taskName = `copy:${path.basename(source.replace('/**/*', ''))}`;
    const task     = () => src(source, { encoding: false }).pipe(dest(destination));
    task.displayName = taskName;
    return task;
});

export const release = series(
    function clean()    { return exec('rm -rf build/ release/'); },
    function build() {
        return exec('pnpm build', {
            ...spawnEnv,
            OUTPUT_PATH: `${BUILD_DIR}/resources/build`,
        });
    },
    function makePot()  { return exec('pnpm make-pot'); },
    parallel(...copyTasks),
    function composer() {
        return exec(`cd ${BUILD_DIR} && composer install --no-dev --optimize-autoloader`);
    },
    function compress() {
        return src(
            ['./build/**/*', '!./build/**/*.map', '!./build/**/composer.lock', '!./build/**/*.sh'],
            { encoding: false },
        )
            .pipe(zip(`${PLUGIN_SLUG}.zip`))
            .pipe(dest('./release/'));
    },
    function cleanup()  { return exec('rm -rf build/'); },
);
