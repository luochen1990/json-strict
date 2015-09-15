{Int} = require '../../src/'

matchCases =
	'doesnt match undefined/null/NaN': [
		[Int, undefined, no]
		[Int, null, no]
		[Int, NaN, no]
	]
	'doesnt match true/false': [
		[Int, true, no]
		[Int, false, no]
	]
	'doesnt match any other types': [
		[Int, 1.23, no]
		[Int, -0.0001, no]
		[Int, 'a', no]
		[Int, {}, no]
		[Int, [], no]
	]
	'matches integers': [
		[Int, 0, yes]
		[Int, -1, yes]
		[Int, 1, yes]
		[Int, 1e9, yes]
		[Int, -1e9, yes]
	]

module.exports = {matchCases}
