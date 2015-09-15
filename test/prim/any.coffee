{Any} = require '../../src/'

matchCases =
	'doesnt match undefined/null': [
		[Any, undefined, no]
		[Any, null, no]
	]
	'matches any other types': [
		[Any, true, yes]
		[Any, 1, yes]
		[Any, 'a', yes]
		[Any, {}, yes]
		[Any, [], yes]
	]

module.exports = {matchCases}
