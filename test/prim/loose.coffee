{Loose, match, show} = require '../../src/'

describe 'prim/Loose', ->
	describe 'match', ->
		it 'doesnt match undefined/null', ->
			assert -> match(Loose {})(undefined) is no
			assert -> match(Loose {})(null) is no
			assert -> match(Loose {x: Number, y: String})(undefined) is no
			assert -> match(Loose {x: Number, y: String})(null) is no
		it 'doesnt match values of any other types', ->
			assert -> match(Loose {x: Number, y: String})(true) is no
			assert -> match(Loose {x: Number, y: String})(1) is no
			assert -> match(Loose {x: Number, y: String})('c') is no
		it 'doesnt match objects lacking keys', ->
			assert -> match(Loose {x: Number, y: String})({}) is no
			assert -> match(Loose {x: Number, y: String})({x: 1}) is no
			assert -> match(Loose {x: Number, y: String})({y: 'a'}) is no
			assert -> match(Loose {x: Number, y: String})({x: 1, z: 'a'}) is no
			assert -> match(Loose {x: Number, y: String})({y: 'abc', z: 2}) is no
		it 'doesnt match objects with correct keys but wrong values', ->
			assert -> match(Loose {x: Number, y: String})({x: 1, y: 2}) is no
			assert -> match(Loose {x: Number, y: String})({x: 'abc', y: 'abc'}) is no
		it 'matches objects with correct keys and values', ->
			assert -> match(Loose {})({}) is yes
			assert -> match(Loose {x: Number, y: String})({x: 1, y: ''}) is yes
			assert -> match(Loose {x: Number, y: String})({x: 1.23, y: 'abc'}) is yes
		it 'matches objects with extra keys', ->
			assert -> match(Loose {})({x: 1}) is yes
			assert -> match(Loose {x: Number, y: String})({x: 1.23, y: '', z: 1}) is yes
			assert -> match(Loose {x: Number, y: String})({x: 1, y: 'a', w: {}}) is yes

