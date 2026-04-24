import chalk from 'chalk';
import { spawn } from 'child_process';
import { dest, parallel, series, src } from 'gulp';
import zip from 'gulp-zip';
import path from 'path';

const PLUGIN_SLUG = 'allfeedback';
const BUILD_DIR = `build/${PLUGIN_SLUG}`;

function exec(command) {
	console.log(`Executing: ${command}`);

	return new Promise((resolve, reject) => {
		const parts = command.split(' ');
		const cmd = parts[0];
		const args = parts.slice(1);
		const child = spawn(cmd, args, {
			shell: true,
			stdio: 'pipe',
		});

		child.stdout.on('data', (data) => {
			console.log(chalk.green(data.toString().trim()));
		});

		child.stderr.on('data', (data) => {
			console.error(chalk.red(data.toString().trim()));
		});

		child.on('close', (code) => {
			if (code === 0) {
				console.log(
					chalk.green(`✓ Command completed successfully: ${command}`),
				);
				resolve();
			} else {
				console.error(
					chalk.red(`✗ Command failed with exit code ${code}: ${command}`),
				);
				reject(new Error(`Command failed with exit code ${code}`));
			}
		});

		child.on('error', (err) => {
			console.error(chalk.red(`✗ Failed to start command: ${command}`));
			console.error(chalk.red(err));
			reject(err);
		});
	});
}

const FILES = {
	'src/**/*': `${BUILD_DIR}/src`,
	'config/**/*': `${BUILD_DIR}/config`,
	'database/**/*': `${BUILD_DIR}/database`,
	'templates/**/*': `${BUILD_DIR}/templates`,
	'resources/build/**/*.{js,css,php}': `${BUILD_DIR}/resources/build`,
	'resources/scripts/**/*': `${BUILD_DIR}/resources/scripts`,
	'resources/styles/**/*': `${BUILD_DIR}/resources/styles`,
	'resources/data/**/*': `${BUILD_DIR}/resources/data`,
	'assets/**/*': `${BUILD_DIR}/assets`,
	'languages/**/*': `${BUILD_DIR}/languages`,
	'allcoach.php': BUILD_DIR,
	'uninstall.php': BUILD_DIR,
	'readme.txt': BUILD_DIR,
	'changelog.txt': BUILD_DIR,
	'composer.json': BUILD_DIR,
	'composer.lock': BUILD_DIR,
};

const copyTasks = Object.entries(FILES).map(([source, destination]) => {
	const taskName = `copy:${path.basename(source.replace('/**/*', '').replace('/**/*.{js,css,php}', ''))}`;
	const copyTask = function () {
		return src(source, { encoding: false }).pipe(dest(destination));
	};
	copyTask.displayName = taskName;
	return copyTask;
});

const release = series(
	function clean() {
		return exec('rm -rf build/ release/');
	},
	function build() {
		return exec('pnpm build');
	},
	function makePot() {
		return exec('pnpm make-pot');
	},
	parallel(...copyTasks),
	function composer() {
		return exec(
			`cd ${BUILD_DIR} && composer install --no-dev --optimize-autoloader`,
		);
	},
	function compress() {
		return src(
			[
				'./build/**/*',
				'!./build/**/composer.lock',
				'!./build/**/*.sh',
				'!./build/**/*.bat',
				'!./build/**/bin/carbon',
				'!./build/**/',
				'!./build/**/$programId.edit.tsx',
			],
			{
				encoding: false,
			},
		)
			.pipe(zip(`${PLUGIN_SLUG}.zip`))
			.pipe(dest('./release/'));
	},
	function afterBuild() {
		return exec('rm -rf build/');
	},
);

export { release };
