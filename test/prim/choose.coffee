{Choose, match, show} = require '../../src/'

describe 'prim/Choose', ->
	describe 'match', ->
		it 'doesnt match undefined/null', ->
			assert -> match(Choose [])(undefined) is no
			assert -> match(Choose [])(null) is no
			assert -> match(Choose [Number])(undefined) is no
			assert -> match(Choose [Number])(null) is no
			assert -> match(Choose [Number, String])(undefined) is no
			assert -> match(Choose [Number, String])(null) is no
		it 'doesnt match values of any other types', ->
			assert -> match(Choose [Number, String])(true) is no
			assert -> match(Choose [Number, String])({}) is no
			assert -> match(Choose [Number, String])([]) is no
		it 'matches values with correct type', ->
			assert -> match(Choose [Number])(1) is yes
			assert -> match(Choose [Number, String])(1) is yes
			assert -> match(Choose [Number, String])('abc') is yes
			assert -> match(Choose [{x: Number}, {y: String}])({x: 1}) is yes
			assert -> match(Choose [{x: Number}, {y: String}])({y: 'a'}) is yes

