import * as path from 'node:path';
import * as vscode from 'vscode';

/** File extensions VS Code treats as Markdown by default. */
const MARKDOWN_EXTENSIONS = new Set([
	'.md',
	'.markdown',
	'.mdown',
	'.mkd',
	'.mkdn',
	'.mdwn',
	'.mdtxt',
	'.mdtext',
]);

export function looksLikeMarkdown(uri: vscode.Uri): boolean {
	return MARKDOWN_EXTENSIONS.has(path.extname(uri.path).toLowerCase());
}

function isSameUri(a: vscode.Uri, b: vscode.Uri): boolean {
	return a.toString() === b.toString();
}

/**
 * Finds the folders among the items selected in the Explorer, as URI strings.
 * A URI does not say whether it names a file or a folder, so this asks the
 * file system. A single selection is not checked: the clicked item is opened
 * whatever it is.
 */
export async function findSelectedFolders(selected: unknown): Promise<Set<string>> {
	const folders = new Set<string>();
	if (!Array.isArray(selected) || selected.length < 2) {
		return folders;
	}
	await Promise.all(
		selected.map(async (item: unknown) => {
			if (!(item instanceof vscode.Uri) || item.scheme !== 'file') {
				return;
			}
			try {
				const stat = await vscode.workspace.fs.stat(item);
				if ((stat.type & vscode.FileType.Directory) !== 0) {
					folders.add(item.toString());
				}
			} catch {
				// Deleted or unreadable since it was selected: not a folder to open.
			}
		}),
	);
	return folders;
}

/**
 * Works out which files and folders a command invocation refers to.
 *
 * VS Code passes different arguments depending on where the command was run:
 * - Explorer context menu: the clicked item, then all selected items.
 * - Editor context menu, title bar button, tab context menu: the file.
 * - Command Palette or a keybinding: nothing, so `active` is used.
 *
 * Arguments are typed `unknown` because any extension or keybinding can run
 * the command with arbitrary arguments; anything that is not a URI is ignored.
 *
 * `isFolder` says which selected items are folders; see `findSelectedFolders`.
 */
export function resolveTargets(
	clicked: unknown,
	selected: unknown,
	active: vscode.Uri | undefined,
	isFolder: (uri: vscode.Uri) => boolean = () => false,
): vscode.Uri[] {
	if (!(clicked instanceof vscode.Uri)) {
		return active ? [active] : [];
	}

	const selection = Array.isArray(selected)
		? selected.filter((item): item is vscode.Uri => item instanceof vscode.Uri)
		: [];
	const isMultiSelect = selection.length > 1 && selection.some((uri) => isSameUri(uri, clicked));
	if (!isMultiSelect) {
		return [clicked];
	}

	// The clicked item is always opened. Other selected items are included only
	// if they are Markdown files or folders, so a mixed selection leaves out
	// files Dinkus is not meant for.
	const targets: vscode.Uri[] = [];
	for (const uri of selection) {
		const wanted = isSameUri(uri, clicked) || looksLikeMarkdown(uri) || isFolder(uri);
		if (wanted && !targets.some((target) => isSameUri(target, uri))) {
			targets.push(uri);
		}
	}
	return targets;
}

export interface PartitionedTargets {
	/** Files and folders on this machine's disk, which Dinkus can open. */
	local: vscode.Uri[];
	/** New files that have never been saved. */
	unsaved: vscode.Uri[];
	/** Files that live somewhere else: a remote machine, a container, a virtual file system. */
	notLocal: vscode.Uri[];
}

/** Separates files Dinkus can open from the ones it cannot reach. */
export function partitionTargets(targets: readonly vscode.Uri[]): PartitionedTargets {
	const result: PartitionedTargets = { local: [], unsaved: [], notLocal: [] };
	for (const uri of targets) {
		if (uri.scheme === 'file') {
			result.local.push(uri);
		} else if (uri.scheme === 'untitled') {
			result.unsaved.push(uri);
		} else {
			result.notLocal.push(uri);
		}
	}
	return result;
}
