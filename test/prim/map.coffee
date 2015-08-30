{Map, match, show} = require '../../src/'

describe 'prim/Map', ->
	describe 'match', ->
		it 'doesnt match undefined/null', ->
			assert -> match(Map(String)(Number))(undefined) is no
			assert -> match(Map(String)(Number))(null) is no
		it 'doesnt match values of any other types', ->
			assert -> match(Map(String)(Number))(true) is no
			assert -> match(Map(String)(Number))(1) is no
			assert -> match(Map(String)(Number))('c') is no
		it 'doesnt match objects with wrong keys', ->
		it 'doesnt match objects with correct keys but wrong values', ->
			assert -> match(Map(String)(Number))({a: 1, b: 'a'}) is no
			assert -> match(Map(String)(Number))({a: null}) is no
			assert -> match(Map(String)(Number))({a: {c: 1}, b: 2}) is no
		it 'matches empty objects', ->
			assert -> match(Map(String)(Number))({}) is yes
		it 'matches objects with correct keys and values', ->
			assert -> match(Map(String)(Number))({a: 1}) is yes
			assert -> match(Map(String)(Number))({a: 1, b: 2}) is yes

