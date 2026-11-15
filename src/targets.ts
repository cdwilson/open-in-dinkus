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
 * Works out which files a command invocation refers to.
 *
 * VS Code passes different arguments depending on where the command was run:
 * - Explorer context menu: the clicked file, then all selected files.
 * - Editor context menu, title bar button, tab context menu: the file.
 * - Command Palette or a keybinding: nothing, so `active` is used.
 *
 * Arguments are typed `unknown` because any extension or keybinding can run
 * the command with arbitrary arguments; anything that is not a URI is ignored.
 */
export function resolveTargets(
	clicked: unknown,
	selected: unknown,
	active: vscode.Uri | undefined,
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

	// The clicked file is always opened. Other selected files are included only
	// if they are Markdown, so a mixed selection opens just its Markdown files.
	const targets: vscode.Uri[] = [];
	for (const uri of selection) {
		const wanted = isSameUri(uri, clicked) || looksLikeMarkdown(uri);
		if (wanted && !targets.some((target) => isSameUri(target, uri))) {
			targets.push(uri);
		}
	}
	return targets;
}

export interface PartitionedTargets {
	/** Files on this machine's disk, which Dinkus can open. */
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
