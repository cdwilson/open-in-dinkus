import * as vscode from 'vscode';
import { launchDinkus, type LaunchFailure } from './dinkus';
import { findSelectedFolders, partitionTargets, resolveTargets } from './targets';

const COMMAND_ID = 'openInDinkus.open';
const DINKUS_WEBSITE = 'https://dinkus.textualize.io/';
/** Opening more files and folders than this at once asks for confirmation first. */
const CONFIRM_THRESHOLD = 10;

/**
 * Called by VS Code the first time the command is used. The extension does
 * nothing at startup and nothing in the background.
 */
export function activate(context: vscode.ExtensionContext): void {
	const log = vscode.window.createOutputChannel('Open in Dinkus', { log: true });
	context.subscriptions.push(
		log,
		vscode.commands.registerCommand(COMMAND_ID, (clicked?: unknown, selected?: unknown) =>
			openInDinkus(log, clicked, selected),
		),
	);
}

export function deactivate(): void {
	// Nothing to clean up: everything is registered in context.subscriptions.
}

/**
 * The command. Resolves to true when its targets were handed to Dinkus, so
 * keybindings, other extensions and tests can tell whether it worked.
 */
async function openInDinkus(log: vscode.LogOutputChannel, clicked: unknown, selected: unknown): Promise<boolean> {
	if (process.platform !== 'darwin') {
		void vscode.window.showErrorMessage(
			'Dinkus is a macOS app, so Open in Dinkus only works when VS Code is running on a Mac.',
		);
		return false;
	}

	const folders = await findSelectedFolders(selected);
	const targets = resolveTargets(clicked, selected, activeFileUri(), (uri) => folders.has(uri.toString()));
	if (targets.length === 0) {
		void vscode.window.showInformationMessage(
			'Open a Markdown file, or right-click a Markdown file or a folder in the Explorer, to open it in Dinkus.',
		);
		return false;
	}

	const { local, unsaved, notLocal } = partitionTargets(targets);
	if (unsaved.length > 0) {
		void vscode.window.showWarningMessage('Save the file to disk before opening it in Dinkus.');
	}
	if (notLocal.length > 0) {
		void vscode.window.showWarningMessage(
			'Dinkus can only open files and folders stored on this Mac. Remote and virtual ones cannot be opened.',
		);
	}
	if (local.length === 0) {
		return false;
	}

	if (local.length > CONFIRM_THRESHOLD) {
		const open = 'Open';
		const choice = await vscode.window.showWarningMessage(
			`Open ${local.length} items in Dinkus?`,
			{ modal: true },
			open,
		);
		if (choice !== open) {
			return false;
		}
	}

	if (vscode.workspace.getConfiguration('openInDinkus').get<boolean>('saveBeforeOpening', true)) {
		await saveUnsavedChanges(local, log);
	}

	const paths = local.map((uri) => uri.fsPath);
	log.info(`Opening in Dinkus: ${paths.join(', ')}`);
	const result = await launchDinkus(paths);
	if (result.ok) {
		return true;
	}

	log.error(`Could not open in Dinkus: ${result.detail}`);
	// Not awaited: the notification stays up until dismissed, and the command
	// should finish as soon as the outcome is known.
	void reportFailure(result, log);
	return false;
}

async function reportFailure(result: LaunchFailure, log: vscode.LogOutputChannel): Promise<void> {
	if (result.reason === 'not-installed') {
		const getDinkus = 'Get Dinkus';
		const choice = await vscode.window.showErrorMessage(
			'Dinkus does not appear to be installed on this Mac.',
			getDinkus,
		);
		if (choice === getDinkus) {
			await vscode.env.openExternal(vscode.Uri.parse(DINKUS_WEBSITE));
		}
		return;
	}

	const showLog = 'Show Log';
	const choice = await vscode.window.showErrorMessage(
		`Could not open in Dinkus. ${truncate(result.detail, 300)}`,
		showLog,
	);
	if (choice === showLog) {
		log.show();
	}
}

/** The file in the active editor tab, used when the command is run without arguments. */
function activeFileUri(): vscode.Uri | undefined {
	const editorUri = vscode.window.activeTextEditor?.document.uri;
	if (editorUri) {
		return editorUri;
	}
	// The active tab may be a custom editor rather than a text editor.
	const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
	if (input instanceof vscode.TabInputText || input instanceof vscode.TabInputCustom) {
		return input.uri;
	}
	return undefined;
}

/**
 * Saves any of the given files that have unsaved changes, so Dinkus reads the
 * current text. Folders are skipped: the files inside them are not saved.
 */
async function saveUnsavedChanges(uris: readonly vscode.Uri[], log: vscode.LogOutputChannel): Promise<void> {
	for (const uri of uris) {
		const key = uri.toString();
		const document = vscode.workspace.textDocuments.find((doc) => doc.uri.toString() === key);
		if (!document?.isDirty) {
			continue;
		}
		const saved = await document.save();
		if (!saved) {
			log.warn(`Could not save ${uri.fsPath}; Dinkus will show the last saved version.`);
			void vscode.window.showWarningMessage(
				'Could not save your changes, so Dinkus will show the last saved version of the file.',
			);
		}
	}
}

function truncate(text: string, maxLength: number): string {
	return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}
