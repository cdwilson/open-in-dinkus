import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { findSelectedFolders, looksLikeMarkdown, partitionTargets, resolveTargets } from '../targets';

const file = (name: string) => vscode.Uri.file(`/Users/someone/notes/${name}`);
const names = (uris: vscode.Uri[]) => uris.map((uri) => uri.path.split('/').pop());

suite('resolveTargets', () => {
	test('uses the active file when run without arguments', () => {
		assert.deepStrictEqual(names(resolveTargets(undefined, undefined, file('a.md'))), ['a.md']);
	});

	test('returns nothing when there are no arguments and no active file', () => {
		assert.deepStrictEqual(resolveTargets(undefined, undefined, undefined), []);
	});

	test('prefers the clicked file over the active file', () => {
		assert.deepStrictEqual(names(resolveTargets(file('a.md'), undefined, file('b.md'))), ['a.md']);
	});

	test('ignores the second argument when it is not a list of files', () => {
		// The editor title bar passes { groupId } as the second argument.
		assert.deepStrictEqual(names(resolveTargets(file('a.md'), { groupId: 1 }, undefined)), ['a.md']);
	});

	test('ignores arguments that are not URIs', () => {
		assert.deepStrictEqual(names(resolveTargets('/etc/passwd', ['/etc/hosts'], file('a.md'))), ['a.md']);
		assert.deepStrictEqual(resolveTargets({ fsPath: '/etc/passwd' }, undefined, undefined), []);
	});

	test('opens every Markdown file in an Explorer multi-selection', () => {
		const selection = [file('a.md'), file('b.markdown'), file('c.MD')];
		assert.deepStrictEqual(names(resolveTargets(file('b.markdown'), selection, undefined)), [
			'a.md',
			'b.markdown',
			'c.MD',
		]);
	});

	test('skips non-Markdown files in a multi-selection but keeps the clicked file', () => {
		const selection = [file('a.md'), file('photo.png'), file('notes.txt')];
		assert.deepStrictEqual(names(resolveTargets(file('notes.txt'), selection, undefined)), [
			'a.md',
			'notes.txt',
		]);
	});

	test('removes duplicates from a multi-selection', () => {
		const selection = [file('a.md'), file('a.md'), file('b.md')];
		assert.deepStrictEqual(names(resolveTargets(file('a.md'), selection, undefined)), ['a.md', 'b.md']);
	});

	test('ignores a selection that does not contain the clicked file', () => {
		const selection = [file('b.md'), file('c.md')];
		assert.deepStrictEqual(names(resolveTargets(file('a.md'), selection, undefined)), ['a.md']);
	});

	test('opens a clicked folder', () => {
		assert.deepStrictEqual(names(resolveTargets(file('docs'), [file('docs')], file('a.md'))), ['docs']);
	});

	test('keeps folders and Markdown files in a multi-selection and skips other files', () => {
		const selection = [file('docs'), file('a.md'), file('photo.png'), file('drafts')];
		const isFolder = (uri: vscode.Uri) => ['docs', 'drafts'].includes(uri.path.split('/').pop() ?? '');
		assert.deepStrictEqual(names(resolveTargets(file('a.md'), selection, undefined, isFolder)), [
			'docs',
			'a.md',
			'drafts',
		]);
	});
});

suite('findSelectedFolders', () => {
	// The test instance has the examples folder open.
	const example = (...segments: string[]) => {
		const folder = vscode.workspace.workspaceFolders?.[0];
		assert.ok(folder, 'the examples folder should be open in the test instance');
		return vscode.Uri.joinPath(folder.uri, ...segments);
	};

	test('finds the folders in a selection', async () => {
		const selection = [example('assets'), example('sample.md'), example('image-paths'), example('missing')];
		const folders = await findSelectedFolders(selection);
		assert.deepStrictEqual([...folders].sort(), [example('assets').toString(), example('image-paths').toString()]);
	});

	test('ignores folders that are not on the local disk and items that are not URIs', async () => {
		const remote = vscode.Uri.parse('vscode-remote://ssh-remote+host/home/someone/docs');
		const folders = await findSelectedFolders([remote, example('assets').fsPath, example('sample.md')]);
		assert.strictEqual(folders.size, 0);
	});

	test('does not check a single selection or a missing one', async () => {
		assert.strictEqual((await findSelectedFolders([example('assets')])).size, 0);
		assert.strictEqual((await findSelectedFolders(undefined)).size, 0);
		assert.strictEqual((await findSelectedFolders({ groupId: 1 })).size, 0);
	});
});

suite('looksLikeMarkdown', () => {
	test('recognises Markdown extensions regardless of case', () => {
		assert.ok(looksLikeMarkdown(file('README.md')));
		assert.ok(looksLikeMarkdown(file('README.MARKDOWN')));
		assert.ok(!looksLikeMarkdown(file('README.txt')));
		assert.ok(!looksLikeMarkdown(file('md')));
	});
});

suite('partitionTargets', () => {
	test('separates local, unsaved and non-local files', () => {
		const local = file('a.md');
		const unsaved = vscode.Uri.parse('untitled:Untitled-1');
		const remote = vscode.Uri.parse('vscode-remote://ssh-remote+host/home/someone/a.md');
		const virtual = vscode.Uri.parse('vscode-vfs://github/owner/repo/a.md');

		const result = partitionTargets([local, unsaved, remote, virtual]);

		assert.deepStrictEqual(result.local, [local]);
		assert.deepStrictEqual(result.unsaved, [unsaved]);
		assert.deepStrictEqual(result.notLocal, [remote, virtual]);
	});
});
