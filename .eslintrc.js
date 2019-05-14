'use strict';
const node = '12.2.0';
module.exports = {
	'env': {
		'es6': true,
		'mocha': true,
		'node': true
	},
	'extends': ['eslint:recommended', 'plugin:node/recommended'],
	'plugins': ['node', 'no-inferred-method-name'],
	'parserOptions': {
		'ecmaVersion': 2018,
		'sourceType': 'module'
	},
	'rules': {
		'indent': [
			'warn',
			'tab',
			{
				'SwitchCase': 1
			}
		],
		'linebreak-style': [
			'error',
			'unix'
		],
		'quotes': [
			'warn',
			'single'
		],
		'semi': [
			'warn',
			'always'
		],
		'no-console': [
			'off'
		],
		'comma-dangle': ['error', 'never'],
		'no-unused-vars': ['warn', {'vars': 'all', 'args': 'none'}],
		'no-process-exit': 0,
		'node/no-unpublished-require': 0,
		'node/no-extraneous-require': 0,
		'node/no-unsupported-features/es-syntax': ['error', {'version': node}],
		'node/no-unsupported-features/es-builtins': ['error', {'version': node}],
		'node/no-unsupported-features/node-builtins': ['error', {'version': node}]
	}
};
