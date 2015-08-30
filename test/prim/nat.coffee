{Nat, match, show} = require '../../src/'

describe 'prim/Nat', ->
	describe 'match', ->
		it 'doesnt match undefined/null/NaN', ->
			assert -> match(Nat)(undefined) is no
			assert -> match(Nat)(null) is no
			assert -> match(Nat)(NaN) is no
		it 'doesnt match true/false', ->
			assert -> match(Nat)(true) is no
			assert -> match(Nat)(false) is no
		it 'doesnt match any other types', ->
			assert -> match(Nat)(1.23) is no
			assert -> match(Nat)(-0.0001) is no
			assert -> match(Nat)('a') is no
			assert -> match(Nat)({}) is no
			assert -> match(Nat)([]) is no
		it 'doesnt match negatives', ->
			assert -> match(Nat)(-1) is no
			assert -> match(Nat)(-1.1) is no
			assert -> match(Nat)(-1e9) is no
		it 'matches positive integers', ->
			assert -> match(Nat)(0) is yes
			assert -> match(Nat)(1) is yes
			assert -> match(Nat)(2) is yes
			assert -> match(Nat)(1e9) is yes

