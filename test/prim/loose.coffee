{Loose} = require '../../src/'

matchCases =
	'doesnt match undefined/null': [
		[Loose({}), undefined, no]
		[Loose({}), null, no]
		[Loose({x: Number, y: String}), undefined, no]
		[Loose({x: Number, y: String}), null, no]
	]
	'doesnt match values of any other types': [
		[Loose({x: Number, y: String}), true, no]
		[Loose({x: Number, y: String}), 1, no]
		[Loose({x: Number, y: String}), 'c', no]
	]
	'doesnt match objects lacking keys': [
		[Loose({x: Number, y: String}), {}, no]
		[Loose({x: Number, y: String}), {x: 1}, no]
		[Loose({x: Number, y: String}), {y: 'a'}, no]
		[Loose({x: Number, y: String}), {x: 1, z: 'a'}, no]
		[Loose({x: Number, y: String}), {y: 'abc', z: 2}, no]
	]
	'doesnt match objects with correct keys but wrong values': [
		[Loose({x: Number, y: String}), {x: 1, y: 2}, no]
		[Loose({x: Number, y: String}), {x: 'abc', y: 'abc'}, no]
	]
	'matches objects with correct keys and values': [
		[Loose({}), {}, yes]
		[Loose({x: Number, y: String}), {x: 1, y: ''}, yes]
		[Loose({x: Number, y: String}), {x: 1.23, y: 'abc'}, yes]
	]
	'matches objects with extra keys': [
		[Loose({}), {x: 1}, yes]
		[Loose({x: Number, y: String}), {x: 1, y: '', z: 1}, yes]
		[Loose({x: Number, y: String}), {x: 1.23, y: 'abc', w: {}}, yes]
	]

module.exports = {matchCases}
