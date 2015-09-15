
matchCases =
	'doesnt match undefined/null': [
		[{}, undefined, no]
		[{}, null, no]
		[{x: Number, y: String}, undefined, no]
		[{x: Number, y: String}, null, no]
	]
	'doesnt match values of any other types': [
		[{x: Number, y: String}, true, no]
		[{x: Number, y: String}, 1, no]
		[{x: Number, y: String}, 'c', no]
	]
	'doesnt match objects with wrong keys': [
		[{x: Number, y: String}, {}, no]
		[{x: Number, y: String}, {x: 1}, no]
		[{x: Number, y: String}, {x: 1, z: 'a'}, no]
		[{x: Number, y: String}, {x: 1, y: 'abc', z: 2}, no]
	]
	'doesnt match objects with correct keys but wrong values': [
		[{x: Number, y: String}, {x: 1, y: 2}, no]
		[{x: Number, y: String}, {x: 'abc', y: 'abc'}, no]
	]
	'matches objects with correct keys and values': [
		[{}, {}, yes]
		[{x: Number, y: String}, {x: 1, y: ''}, yes]
		[{x: Number, y: String}, {x: 1.23, y: 'abc'}, yes]
	]

module.exports = {matchCases}
