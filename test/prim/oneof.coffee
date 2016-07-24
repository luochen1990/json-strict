{OneOf} = require '../../src/'

matchCases =
	'doesnt match undefined/null': [
		[OneOf([]), undefined, no]
		[OneOf([]), null, no]
		[OneOf([Number]), undefined, no]
		[OneOf([Number]), null, no]
		[OneOf([Number, String]), undefined, no]
		[OneOf([Number, String]), null, no]
	]
	'doesnt match values of any other types': [
		[OneOf([Number, String]), true, no]
		[OneOf([Number, String]), {}, no]
		[OneOf([Number, String]), [], no]
	]
	'matches values with correct type': [
		[OneOf([Number]), 1, yes]
		[OneOf([Number, String]), 1, yes]
		[OneOf([Number, String]), 'abc', yes]
		[OneOf([{x: Number}, {y: String}]), {x: 1}, yes]
		[OneOf([{x: Number}, {y: String}]), {y: 'a'}, yes]
	]

module.exports = {matchCases}
