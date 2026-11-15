import { defineConfig } from '@vscode/test-cli';

// `npm test` downloads a private copy of VS Code into .vscode-test/, loads
// this extension into it, and runs the compiled tests inside that instance.
export default defineConfig({
	files: 'out/test/**/*.test.js',
	workspaceFolder: './examples',
	mocha: {
		ui: 'tdd',
		timeout: 20000,
	},
});
