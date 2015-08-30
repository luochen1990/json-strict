{TreeMap, match, show} = require '../../src/'

describe 'prim/TreeMap', ->
	describe 'match', ->
		it 'doesnt match undefined/null', ->
			assert -> match(TreeMap(String)(Number))(undefined) is no
			assert -> match(TreeMap(String)(Number))(null) is no
		it 'doesnt match values of any other types', ->
			assert -> match(TreeMap(String)(Number))(true) is no
			assert -> match(TreeMap(String)(Number))(1) is no
			assert -> match(TreeMap(String)(Number))('c') is no
		it 'doesnt match objects with wrong keys', ->
			assert -> match(TreeMap(String)(Number))({}) is no
			assert -> match(TreeMap(String)(Number))({a: 1, b: 2}) is no
			assert -> match(TreeMap(String)(Number))({node1: 1}) is no
			assert -> match(TreeMap(String)(Number))({leaf1: 1}) is no
		it 'doesnt match objects with correct keys but wrong values', ->
			assert -> match(TreeMap(String)(Number))({leaf: null}) is no
			assert -> match(TreeMap(String)(Number))({node: {a: {leaf: null}}}) is no
			assert -> match(TreeMap(String)(Number))({
				node: {
					a: {leaf: 1},
					b: {leaf: 'a'}
				}}) is no
			assert -> match(TreeMap(String)(Number))({
				node: {
					a: {leaf: 1},
					b: {node: {
						c: {leaf: 'a'}
					}}
				}}) is no
		it 'matches objects with correct keys and values', ->
			assert -> match(TreeMap(String)(Number))({leaf: 1}) is yes
			assert -> match(TreeMap(String)(Number))({node: {a: {leaf: 1}}}) is yes
			assert -> match(TreeMap(String)(Number))({
				node: {
					a: {leaf: 1},
					b: {leaf: 2}
				}}) is yes
			assert -> match(TreeMap(String)(Number))({
				node: {
					a: {leaf: 1},
					b: {node: {
						c: {leaf: 2}
						d: {leaf: 3}
						e: {node: {
							f: {leaf: 4}
							g: {leaf: 5}
						}}
						h: {node: {
							i: {leaf: 6}
						}}
					}}
				}}) is yes

