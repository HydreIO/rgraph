module.exports = {
	presets: [
		[
			'@babel/env',
			{
				targets: {
					node: 'current'
				}
			}
		]
	],
	plugins: [
		['@babel/plugin-proposal-decorators', { legacy: true }],
		['@babel/plugin-proposal-class-properties', { loose: true }],
		['@babel/plugin-proposal-private-methods', { loose: true }],
		['@babel/plugin-proposal-function-bind'],
		['@babel/plugin-proposal-optional-chaining'],
		['@babel/plugin-proposal-export-default-from'],
		['@babel/plugin-proposal-optional-catch-binding'],
		['@babel/plugin-proposal-numeric-separator'],
		['@babel/plugin-syntax-dynamic-import'],
		['@babel/plugin-proposal-nullish-coalescing-operator'],
		['@babel/plugin-proposal-logical-assignment-operators'],
		['@babel/plugin-proposal-pipeline-operator', { proposal: 'minimal' }],
		['@babel/plugin-proposal-throw-expressions'],
		['@babel/plugin-proposal-do-expressions'],
		['babel-plugin-implicit-function'],
		["import-directory"]
	]
}