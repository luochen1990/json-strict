{Enum, match, show} = require '../../src/'

describe 'prim/Enum', ->
	describe 'match', ->
		it 'doesnt match undefined/null', ->
			assert -> match(Enum ['a', 'b', 'c'])(undefined) is false
			assert -> match(Enum ['a', 'b', 'c'])(null) is false
		it 'matches enumerated values', ->
			assert -> match(Enum ['a', 'b', 'c'])('a') is true
			assert -> match(Enum ['a', 'b', 'c'])('b') is true
			assert -> match(Enum ['a', 'b', 'c'])('c') is true
		it 'doesnt match any other types', ->
			assert -> match(Enum ['a', 'b', 'c'])(true) is false
			assert -> match(Enum ['a', 'b', 'c'])(1) is false
			assert -> match(Enum ['a', 'b', 'c'])('d') is false
			assert -> match(Enum ['a', 'b', 'c'])({}) is false
			assert -> match(Enum ['a', 'b', 'c'])([]) is false

