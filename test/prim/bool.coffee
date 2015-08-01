{Bool, match, show} = require '../../src/'

describe 'prim/Bool', ->
	describe 'match', ->
		it 'doesnt match undefined/null', ->
			assert -> match(Bool)(undefined) is false
			assert -> match(Bool)(null) is false
		it 'matches true/false', ->
			assert -> match(Bool)(true) is true
			assert -> match(Bool)(false) is true
		it 'doesnt match any other types', ->
			assert -> match(Bool)(1) is false
			assert -> match(Bool)('a') is false
			assert -> match(Bool)({}) is false
			assert -> match(Bool)([]) is false

