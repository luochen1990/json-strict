{Tree, match, show} = require '../../src/'

describe 'prim/Tree', ->
	describe 'match', ->
		it 'doesnt match undefined/null', ->
			assert -> match(Tree(String))(undefined) is no
			assert -> match(Tree(Number))(null) is no
		it 'doesnt match values of any other types', ->
			assert -> match(Tree(String))(true) is no
			assert -> match(Tree(Number))(1) is no
			assert -> match(Tree(Number))('c') is no
		it 'doesnt match objects with wrong keys', ->
			assert -> match(Tree(Number))({}) is no
			assert -> match(Tree(Number))({a: 1, b: 2}) is no
			assert -> match(Tree(Number))({rootLabel: 1}) is no
			assert -> match(Tree(Number))({subForest: []}) is no
		it 'doesnt match objects with correct keys but wrong values', ->
			assert -> match(Tree(Number))({rootLabel: 'a', subForest: []}) is no
			assert -> match(Tree(Number))({rootLabel: 1, subForest: 'a'}) is no
			assert -> match(Tree(Number))({rootLabel: 1, subForest: {}}) is no
			assert -> match(Tree(Number))({rootLabel: 1, subForest: [{rootLabel: 'a', subForest: []}]}) is no
			assert -> match(Tree(Number))({rootLabel: 1, subForest: [{rootLabel: 2, subForest: 'a'}]}) is no
		it 'matches objects with correct keys and values', ->
			assert -> match(Tree(Number))({rootLabel: 1, subForest: []}) is yes
			assert -> match(Tree(Number))({rootLabel: 1, subForest: [{rootLabel: 2, subForest: []}]}) is yes
			assert -> match(Tree(Number))({rootLabel: 1, subForest: [{rootLabel: 2, subForest: [{rootLabel: 3, subForest: []}, {rootLabel: 4, subForest: [{rootLabel: 5, subForest: []}]}]}]}) is yes

