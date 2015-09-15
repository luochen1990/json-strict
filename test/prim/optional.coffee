{Optional, Enum} = require '../../src/'

matchCases =
	'matches undefined/null': [
		[Optional(Number), undefined, yes]
		[Optional(Number), null, yes]
		[Optional(Enum(['a', 'b'])), undefined, yes]
		[Optional(Enum(['a', 'b'])), null, yes]
	]
	'matches values of inner-type': [
		[Optional(Number), 1, yes]
		[Optional(Enum(['a', 'b'])), 'a', yes]
		[Optional(Enum(['a', 'b'])), 'b', yes]
	]
	'doesnt match values of any other types': [
		[Optional(Number), true, no]
		[Optional(Enum(['a', 'b'])), 'c', no]
		[Optional(Enum(['a', 'b'])), 1, no]
	]

module.exports = {matchCases}
