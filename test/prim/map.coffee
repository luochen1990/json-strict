{Map} = require '../../src/'

matchCases =
	'doesnt match undefined/null': [
		[Map(String)(Number), undefined, no]
		[Map(String)(Number), null, no]
	]
	'doesnt match values of any other types': [
		[Map(String)(Number), true, no]
		[Map(String)(Number), 1, no]
		[Map(String)(Number), 'c', no]
		[Map(Number)(String), 'c', no]
		[Map(String)(Number), [], no]
	]
	'doesnt match objects with wrong keys': [
	]
	'doesnt match objects with correct keys but wrong values': [
		[Map(String)(Number), {a: 1, b: 'a'}, no]
		[Map(String)(Number), {a: null}, no]
		[Map(String)(Number), {a: {c: 1}, b: 2}, no]
	]
	'matches empty objects': [
		[Map(String)(Number), {}, yes]
	]
	'matches objects with correct keys and values': [
		[Map(String)(Number), {a: 1}, yes]
		[Map(String)(Number), {a: 1, b: 2}, yes]
	]

module.exports = {matchCases}
