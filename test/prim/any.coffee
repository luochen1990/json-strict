{Any, match, show} = require '../../src/'

describe 'prim/Any', ->
	describe 'match', ->
		it 'doesnt match undefined', ->
			assert -> match(Any)(undefined) is false
		it 'doesnt match null', ->
			assert -> match(Any)(null) is false
		it 'matches any other types', ->
			assert -> match(Any)(true) is true
			assert -> match(Any)(1) is true
			assert -> match(Any)('a') is true
			assert -> match(Any)({}) is true
			assert -> match(Any)([]) is true

