{Strict} = require '../../src/'

matchCases =
	'doesnt match undefined/null': [
		[Strict({}), undefined, no]
		[Strict({}), null, no]
		[Strict({x: Number, y: String}), undefined, no]
		[Strict({x: Number, y: String}), null, no]
	]
	'doesnt match values of any other types': [
		[Strict({x: Number, y: String}), true, no]
		[Strict({x: Number, y: String}), 1, no]
		[Strict({x: Number, y: String}), 'c', no]
	]
	'doesnt match objects with wrong keys': [
		[Strict({x: Number, y: String}), {}, no]
		[Strict({x: Number, y: String}), {x: 1}, no]
		[Strict({x: Number, y: String}), {x: 1, z: 'a'}, no]
		[Strict({x: Number, y: String}), {x: 1, y: 'abc', z: 2}, no]
	]
	'doesnt match objects with correct keys but wrong values': [
		[Strict({x: Number, y: String}), {x: 1, y: 2}, no]
		[Strict({x: Number, y: String}), {x: 'abc', y: 'abc'}, no]
	]
	'matches objects with correct keys and values': [
		[Strict({}), {}, yes]
		[Strict({x: Number, y: String}), {x: 1, y: ''}, yes]
		[Strict({x: Number, y: String}), {x: 1.23, y: 'abc'}, yes]
	]

module.exports = {matchCases}
