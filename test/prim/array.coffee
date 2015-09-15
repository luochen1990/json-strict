
matchCases =
	'doesnt match undefined/null': [
		[[Number], undefined, no]
		[[Number], null, no]
	]
	'doesnt match values of any other types': [
		[[Number], true, no]
		[[Number], 1, no]
		[[Number], 'c', no]
		[[Number], {}, no]
	]
	'doesnt match array with undefined/null element': [
		[[Number], [null], no]
		[[Number], [undefined], no]
		[[Number], [null, 1], no]
		[[Number], [undefined, 1], no]
		[[Number], [null, 'a'], no]
		[[Number], [undefined, 'a'], no]
		[[Number], [1, null], no]
		[[Number], [1, undefined], no]
		[[Number], ['a', null], no]
		[[Number], ['a', undefined], no]
		[[Number], [null, null], no]
		[[Number], [null, undefined], no]
		[[Number], [undefined, null], no]
		[[Number], [undefined, undefined], no]
	]
	'doesnt match array with wrong element': [
		[[Number], ['a'], no]
		[[Number], [[1]], no]
		[[Number], [1, 'a'], no]
		[[Number], [1, 'a', 2], no]
	]
	'matches array with correct elements': [
		[[Number], [], yes]
		[[Number], [1], yes]
		[[Number], [1, 2, 100], yes]
	]

module.exports = {matchCases}
