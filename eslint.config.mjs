import eslint from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
	globalIgnores(['dist/', 'out/', '.vscode-test/', 'esbuild.js']),
	eslint.configs.recommended,
	tseslint.configs.recommended,
	{
		rules: {
			curly: 'error',
			eqeqeq: 'error',
			'no-throw-literal': 'error',
		},
	},
);
