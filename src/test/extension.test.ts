import * as assert from 'node:assert';
import * as vscode from 'vscode';

const EXTENSION_ID = 'cdwilson.open-in-dinkus';
const COMMAND_ID = 'openInDinkus.open';

interface MenuItem {
	command: string;
	when?: string;
}

suite('extension', () => {
	test('is installed and registers the command once activated', async () => {
		const extension = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(extension, `${EXTENSION_ID} is not installed in the test instance`);

		await extension.activate();

		const commands = await vscode.commands.getCommands(true);
		assert.ok(commands.includes(COMMAND_ID));
	});

	test('every menu entry is limited to local Markdown files on macOS', () => {
		const extension = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(extension);
		const menus = extension.packageJSON.contributes.menus as Record<string, MenuItem[]>;

		for (const [location, items] of Object.entries(menus)) {
			for (const item of items) {
				assert.strictEqual(item.command, COMMAND_ID);
				for (const condition of ['isMac', 'resourceLangId == markdown', 'resourceScheme == file']) {
					assert.ok(item.when?.includes(condition), `${location} is missing "${condition}"`);
				}
			}
		}
	});

	test('the title bar button has an icon file for light and for dark themes', async () => {
		const extension = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(extension);
		const [command] = extension.packageJSON.contributes.commands as Array<{ icon: Record<string, string> }>;

		for (const theme of ['light', 'dark']) {
			const file = vscode.Uri.joinPath(extension.extensionUri, command.icon[theme]);
			const stat = await vscode.workspace.fs.stat(file);
			assert.ok(stat.size > 0, `${command.icon[theme]} is empty`);
		}
	});

	test('declines to open files that are not on the local disk', async () => {
		const remote = vscode.Uri.parse('vscode-remote://ssh-remote+host/home/someone/notes.md');
		const unsaved = vscode.Uri.parse('untitled:Untitled-1');

		assert.strictEqual(await vscode.commands.executeCommand(COMMAND_ID, remote), false);
		assert.strictEqual(await vscode.commands.executeCommand(COMMAND_ID, unsaved), false);
	});

	// Really starts Dinkus, so it only runs on request: `npm run test:dinkus`.
	test('opens real files in Dinkus', async function () {
		if (process.env.OPEN_IN_DINKUS_E2E !== '1') {
			this.skip();
		}
		const folder = vscode.workspace.workspaceFolders?.[0];
		assert.ok(folder, 'the examples folder should be open in the test instance');
		const sample = vscode.Uri.joinPath(folder.uri, 'sample.md');
		const tricky = vscode.Uri.joinPath(folder.uri, "tricky $(name) & 'quotes'.md");
		const images = vscode.Uri.joinPath(folder.uri, 'image-paths', 'images.md');
		for (const file of [sample, tricky, images]) {
			await vscode.workspace.fs.stat(file); // Fails here if an example file was moved.
		}

		// The same arguments the Explorer passes for a three-file selection.
		const opened = await vscode.commands.executeCommand(COMMAND_ID, tricky, [sample, tricky, images]);

		// This confirms macOS handed the files to Dinkus. Whether the pictures
		// in images.md are displayed can only be checked by looking at Dinkus.
		assert.strictEqual(opened, true);
	});

	test('runs on the local machine and declares its workspace trust support', () => {
		const extension = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(extension);
		const manifest = extension.packageJSON;

		assert.deepStrictEqual(manifest.extensionKind, ['ui']);
		assert.strictEqual(manifest.capabilities.untrustedWorkspaces.supported, true);
		assert.strictEqual(manifest.dependencies, undefined, 'the extension should have no runtime dependencies');
	});
});
