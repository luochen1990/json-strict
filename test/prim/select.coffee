{Select} = require '../../src/'

matchCases =
	'doesnt match undefined/null': [
		[Select({x: Number}), undefined, no]
		[Select({x: Number}), null, no]
		[Select({x: Number, y: String}), undefined, no]
		[Select({x: Number, y: String}), null, no]
	]
	'doesnt match values of any other types': [
		[Select({x: Number, y: String}), true, no]
		[Select({x: Number, y: String}), 1, no]
		[Select({x: Number, y: String}), 'c', no]
	]
	'doesnt match objects with wrong keys': [
		[Select({x: Number, y: String}), {}, no]
		[Select({x: Number, y: String}), {x: 1, y: 'a'}, no]
		[Select({x: Number, y: String}), {x: 1, z: 'a'}, no]
		[Select({x: Number, y: String}), {x: 1, y: 'a', z: 2}, no]
	]
	'doesnt match objects with correct keys but wrong values': [
		[Select({x: Number, y: String}), {x: 'a'}, no]
		[Select({x: Number, y: String}), {y: 1}, no]
	]
	'matches objects with correct keys and values': [
		[Select({x: Number}), {x: 1}, yes]
		[Select({x: Number, y: String}), {x: 1}, yes]
		[Select({x: Number, y: String}), {y: 'a'}, yes]
	]

module.exports = {matchCases}
