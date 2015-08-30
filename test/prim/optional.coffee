{Optional, Enum, match, show} = require '../../src/'

describe 'prim/Optional', ->
	describe 'match', ->
		it 'matches undefined/null', ->
			assert -> match(Optional Number)(undefined) is true
			assert -> match(Optional Number)(null) is true
			assert -> match(Optional Enum ['a', 'b'])(undefined) is true
			assert -> match(Optional Enum ['a', 'b'])(null) is true
		it 'matches values of inner-type', ->
			assert -> match(Optional Number)(1) is true
			assert -> match(Optional Enum ['a', 'b'])('a') is true
			assert -> match(Optional Enum ['a', 'b'])('b') is true
		it 'doesnt match values of any other types', ->
			assert -> match(Optional Number)(true) is false
			assert -> match(Optional Enum ['a', 'b'])(1) is false
			assert -> match(Optional Enum ['a', 'b'])('c') is false

