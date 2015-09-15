{Choose} = require '../../src/'

matchCases =
	'doesnt match undefined/null': [
		[Choose([]), undefined, no]
		[Choose([]), null, no]
		[Choose([Number]), undefined, no]
		[Choose([Number]), null, no]
		[Choose([Number, String]), undefined, no]
		[Choose([Number, String]), null, no]
	]
	'doesnt match values of any other types': [
		[Choose([Number, String]), true, no]
		[Choose([Number, String]), {}, no]
		[Choose([Number, String]), [], no]
	]
	'matches values with correct type': [
		[Choose([Number]), 1, yes]
		[Choose([Number, String]), 1, yes]
		[Choose([Number, String]), 'abc', yes]
		[Choose([{x: Number}, {y: String}]), {x: 1}, yes]
		[Choose([{x: Number}, {y: String}]), {y: 'a'}, yes]
	]

module.exports = {matchCases}
