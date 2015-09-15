{Bool} = require '../../src/'

matchCases =
	'doesnt match undefined/null': [
		[Bool, undefined, no]
		[Bool, null, no]
	]
	'matches true/false': [
		[Bool, true, yes]
		[Bool, false, yes]
	]
	'doesnt match any other types': [
		[Bool, 1, no]
		[Bool, 'a', no]
		[Bool, {}, no]
		[Bool, [], no]
	]

module.exports = {matchCases}
