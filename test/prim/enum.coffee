{Enum} = require '../../src/'

matchCases =
	'doesnt match undefined/null': [
		[Enum(['a', 'b', 'c']), undefined, no]
		[Enum(['a', 'b', 'c']), null, no]
	]
	'matches enumerated values': [
		[Enum(['a', 'b', 'c']), 'a', yes]
		[Enum(['a', 'b', 'c']), 'b', yes]
		[Enum(['a', 'b', 'c']), 'c', yes]
	]
	'doesnt match any other types': [
		[Enum(['a', 'b', 'c']), true, no]
		[Enum(['a', 'b', 'c']), 1, no]
		[Enum(['a', 'b', 'c']), 'd', no]
		[Enum(['a', 'b', 'c']), {}, no]
		[Enum(['a', 'b', 'c']), [], no]
	]

module.exports = {matchCases}
