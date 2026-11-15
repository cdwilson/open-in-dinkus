import { execFile } from 'node:child_process';
import * as path from 'node:path';

/** Bundle identifier of the Dinkus app from the Mac App Store. */
export const DINKUS_BUNDLE_ID = 'io.textualize.dinkus';

/**
 * Absolute path to the macOS `open` tool. It is never looked up through PATH,
 * so a modified PATH cannot substitute a different program.
 */
const OPEN_BINARY = '/usr/bin/open';

const LAUNCH_TIMEOUT_MS = 15_000;

/** Environment variables `open` is allowed to inherit from VS Code. */
const ENV_ALLOWLIST = ['HOME', 'USER', 'LOGNAME', 'TMPDIR', 'LANG', 'LC_ALL', '__CF_USER_TEXT_ENCODING'];

export interface LaunchFailure {
	ok: false;
	reason: 'not-installed' | 'failed';
	detail: string;
}

export type LaunchResult = { ok: true } | LaunchFailure;

/** Runs a program with an argument list and rejects with its error output on failure. */
export type Runner = (file: string, args: readonly string[]) => Promise<void>;

/**
 * Builds the argument list for `open`. Every path must be absolute: `open`
 * treats an argument that looks like a URL as a URL and one that starts with
 * "-" as an option, and an absolute path can be neither.
 */
export function buildOpenArgs(filePaths: readonly string[]): string[] {
	if (filePaths.length === 0) {
		throw new Error('No files to open.');
	}
	for (const filePath of filePaths) {
		if (!path.isAbsolute(filePath)) {
			throw new Error(`Not an absolute file path: ${filePath}`);
		}
	}
	return ['-b', DINKUS_BUNDLE_ID, ...filePaths];
}

/** Only the variables `open` needs, so nothing else in VS Code's environment reaches Dinkus. */
function minimalEnv(): NodeJS.ProcessEnv {
	const env: NodeJS.ProcessEnv = { PATH: '/usr/bin:/bin' };
	for (const name of ENV_ALLOWLIST) {
		const value = process.env[name];
		if (value !== undefined) {
			env[name] = value;
		}
	}
	return env;
}

/**
 * The default runner. `execFile` starts the program directly, without a shell,
 * so file names are passed through exactly as they are and are never
 * interpreted as shell syntax.
 */
const runWithExecFile: Runner = (file, args) =>
	new Promise<void>((resolve, reject) => {
		execFile(
			file,
			[...args],
			{ env: minimalEnv(), timeout: LAUNCH_TIMEOUT_MS, shell: false },
			(error, _stdout, stderr) => {
				if (error) {
					reject(new Error(stderr.trim() || error.message));
				} else {
					resolve();
				}
			},
		);
	});

/** Asks macOS to open the given files in Dinkus. Never throws. */
export async function launchDinkus(
	filePaths: readonly string[],
	run: Runner = runWithExecFile,
): Promise<LaunchResult> {
	try {
		await run(OPEN_BINARY, buildOpenArgs(filePaths));
		return { ok: true };
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error);
		// What `open -b` prints when no installed app has the bundle identifier.
		const notInstalled = detail.includes('LSCopyApplicationURLsForBundleIdentifier');
		return { ok: false, reason: notInstalled ? 'not-installed' : 'failed', detail };
	}
}
