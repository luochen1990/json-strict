{Select, match, show} = require '../../src/'

describe 'prim/Select', ->
	describe 'match', ->
		it 'doesnt match undefined/null', ->
			assert -> match(Select {x: Number})(undefined) is no
			assert -> match(Select {x: Number})(null) is no
			assert -> match(Select {x: Number, y: String})(undefined) is no
			assert -> match(Select {x: Number, y: String})(null) is no
		it 'doesnt match values of any other types', ->
			assert -> match(Select {x: Number, y: String})(true) is no
			assert -> match(Select {x: Number, y: String})(1) is no
			assert -> match(Select {x: Number, y: String})('c') is no
		it 'doesnt match objects with wrong keys', ->
			assert -> match(Select {x: Number, y: String})({}) is no
			assert -> match(Select {x: Number, y: String})({x: 1, y: 'a'}) is no
			assert -> match(Select {x: Number, y: String})({x: 1, z: 'a'}) is no
			assert -> match(Select {x: Number, y: String})({x: 1, y: 'abc', z: 2}) is no
		it 'doesnt match objects with correct keys but wrong values', ->
			assert -> match(Select {x: Number, y: String})({x: 'a'}) is no
			assert -> match(Select {x: Number, y: String})({y: 1}) is no
		it 'matches objects with correct keys and values', ->
			assert -> match(Select {x: Number})({x: 1}) is yes
			assert -> match(Select {x: Number, y: String})({x: 1}) is yes
			assert -> match(Select {x: Number, y: String})({y: 'abc'}) is yes

