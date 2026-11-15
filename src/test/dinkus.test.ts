import * as assert from 'node:assert';
import { buildOpenArgs, DINKUS_BUNDLE_ID, launchDinkus, type Runner } from '../dinkus';

// These tests never start Dinkus: they replace the function that runs `open`
// with a fake that records what it was asked to run.

suite('buildOpenArgs', () => {
	test('targets Dinkus by bundle identifier', () => {
		assert.deepStrictEqual(buildOpenArgs(['/tmp/a.md']), ['-b', DINKUS_BUNDLE_ID, '/tmp/a.md']);
	});

	test('passes shell metacharacters through as plain text, one argument per file', () => {
		const tricky = '/tmp/$(touch pwned) `id` "quoted" & ; | \'single\'.md';
		assert.deepStrictEqual(buildOpenArgs([tricky, '/tmp/b.md']), ['-b', DINKUS_BUNDLE_ID, tricky, '/tmp/b.md']);
	});

	test('rejects paths that are not absolute', () => {
		assert.throws(() => buildOpenArgs(['notes.md']));
		assert.throws(() => buildOpenArgs(['--args']));
		assert.throws(() => buildOpenArgs(['https://example.com/a.md']));
		assert.throws(() => buildOpenArgs(['/tmp/a.md', '-n']));
	});

	test('rejects an empty list', () => {
		assert.throws(() => buildOpenArgs([]));
	});
});

suite('launchDinkus', () => {
	test('runs /usr/bin/open with the file paths', async () => {
		const calls: Array<{ file: string; args: readonly string[] }> = [];
		const run: Runner = async (file, args) => {
			calls.push({ file, args });
		};

		const result = await launchDinkus(['/tmp/a.md', '/tmp/b.md'], run);

		assert.deepStrictEqual(result, { ok: true });
		assert.deepStrictEqual(calls, [
			{ file: '/usr/bin/open', args: ['-b', DINKUS_BUNDLE_ID, '/tmp/a.md', '/tmp/b.md'] },
		]);
	});

	test('reports when Dinkus is not installed', async () => {
		const run: Runner = async () => {
			throw new Error(
				'LSCopyApplicationURLsForBundleIdentifier() failed while trying to determine the application with bundle identifier io.textualize.dinkus.',
			);
		};

		const result = await launchDinkus(['/tmp/a.md'], run);

		assert.strictEqual(result.ok, false);
		assert.strictEqual(result.ok === false && result.reason, 'not-installed');
	});

	test('reports other failures with the error text', async () => {
		const run: Runner = async () => {
			throw new Error('The file /tmp/a.md does not exist.');
		};

		const result = await launchDinkus(['/tmp/a.md'], run);

		assert.deepStrictEqual(result, {
			ok: false,
			reason: 'failed',
			detail: 'The file /tmp/a.md does not exist.',
		});
	});

	test('does not run anything for an invalid path', async () => {
		let ran = false;
		const run: Runner = async () => {
			ran = true;
		};

		const result = await launchDinkus(['relative.md'], run);

		assert.strictEqual(result.ok, false);
		assert.strictEqual(ran, false);
	});
});
