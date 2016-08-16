{Value} = require '../../src/'

matchCases =
	'doesnt match undefined/null': [
		[Value('a'), undefined, no]
		[Value('a'), null, no]
	]
	'matches simple values': [
		[Value('a'), 'a', yes]
		[Value(1), 1, yes]
		[Value(true), true, yes]
		[Value(false), false, yes]
	]
	'doesnt match any other things': [
		[Value('a'), 'ab', no]
		[Value(1), 'ab', no]
		[Value(true), 1, no]
		[Value(false), 0, no]
	]

module.exports = {matchCases}
