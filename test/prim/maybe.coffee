{Maybe, Enum, match, show} = require '../../src/'

describe 'prim/Maybe', ->
	describe 'match', ->
		it 'matches undefined/null', ->
			assert -> match(Maybe Number)(undefined) is true
			assert -> match(Maybe Number)(null) is true
			assert -> match(Maybe Enum ['a', 'b'])(undefined) is true
			assert -> match(Maybe Enum ['a', 'b'])(null) is true
		it 'matches values of inner-type', ->
			assert -> match(Maybe Number)(1) is true
			assert -> match(Maybe Enum ['a', 'b'])('a') is true
			assert -> match(Maybe Enum ['a', 'b'])('b') is true
		it 'doesnt match values of any other types', ->
			assert -> match(Maybe Number)(true) is false
			assert -> match(Maybe Enum ['a', 'b'])(1) is false
			assert -> match(Maybe Enum ['a', 'b'])('c') is false

