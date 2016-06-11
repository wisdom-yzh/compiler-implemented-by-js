module.exports = {
	entry: {
		index: './js/main.js'	,
		thread: './js/compiler/thread.js'
},
	output: {
		filename: '[name].js',
		path: __dirname
	}
}
