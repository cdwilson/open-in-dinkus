// Bundles src/extension.ts into the single file VS Code loads: dist/extension.js.
//   node esbuild.js               development build with source maps
//   node esbuild.js --production  minified build used for publishing
//   node esbuild.js --watch       rebuild on every change (used by F5)
const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * Prints build progress and errors in the format the problem matcher in
 * .vscode/tasks.json reads, so build errors show up in the Problems panel.
 * Change the two together.
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: 'esbuild-problem-matcher',

	setup(build) {
		build.onStart(() => {
			console.log('[watch] build started');
		});
		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`);
				if (location) {
					console.error(`    ${location.file}:${location.line}:${location.column}:`);
				}
			});
			console.log('[watch] build finished');
		});
	},
};

async function main() {
	const ctx = await esbuild.context({
		entryPoints: ['src/extension.ts'],
		bundle: true,
		format: 'cjs',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'node',
		target: 'node20',
		outfile: 'dist/extension.js',
		// VS Code provides the "vscode" module at runtime; it must not be bundled.
		external: ['vscode'],
		logLevel: 'silent',
		plugins: [esbuildProblemMatcherPlugin],
	});
	if (watch) {
		await ctx.watch();
	} else {
		const result = await ctx.rebuild();
		await ctx.dispose();
		if (result.errors.length > 0) {
			process.exit(1);
		}
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
