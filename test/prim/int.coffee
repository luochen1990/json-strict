{Int, match, show} = require '../../src/'

describe 'prim/Int', ->
	describe 'match', ->
		it 'doesnt match undefined/null/NaN', ->
			assert -> match(Int)(undefined) is no
			assert -> match(Int)(null) is no
			assert -> match(Int)(NaN) is no
		it 'doesnt match true/false', ->
			assert -> match(Int)(true) is no
			assert -> match(Int)(false) is no
		it 'doesnt match any other types', ->
			assert -> match(Int)(1.23) is no
			assert -> match(Int)(-0.0001) is no
			assert -> match(Int)('a') is no
			assert -> match(Int)({}) is no
			assert -> match(Int)([]) is no
		it 'matches integers', ->
			assert -> match(Int)(0) is yes
			assert -> match(Int)(-1) is yes
			assert -> match(Int)(1) is yes
			assert -> match(Int)(1e9) is yes
			assert -> match(Int)(-1e9) is yes

