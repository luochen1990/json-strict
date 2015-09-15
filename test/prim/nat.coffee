{Nat} = require '../../src/'

matchCases =
	'doesnt match undefined/null/NaN': [
		[Nat, undefined, no]
		[Nat, null, no]
		[Nat, NaN, no]
	]
	'doesnt match true/false': [
		[Nat, true, no]
		[Nat, false, no]
	]
	'doesnt match any other types': [
		[Nat, 1.23, no]
		[Nat, -0.0001, no]
		[Nat, 'a', no]
		[Nat, {}, no]
		[Nat, [], no]
	]
	'doesnt match negatives': [
		[Nat, -1, no]
		[Nat, -1.1, no]
		[Nat, -1e9, no]
	]
	'matches positive integers': [
		[Nat, 0, yes]
		[Nat, 1, yes]
		[Nat, 2, yes]
		[Nat, 1e9, yes]
	]

module.exports = {matchCases}
