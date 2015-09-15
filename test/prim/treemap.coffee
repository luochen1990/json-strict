{TreeMap} = require '../../src/'

matchCases =
	'doesnt match undefined/null': [
		[TreeMap(String)(Number), undefined, no]
		[TreeMap(String)(Number), null, no]
	]
	'doesnt match values of any other types': [
		[TreeMap(String)(Number), true, no]
		[TreeMap(String)(Number), 1, no]
		[TreeMap(String)(Number), 'c', no]
	]
	'doesnt match objects with wrong keys': [
		[TreeMap(String)(Number), {}, no]
		[TreeMap(String)(Number), {a: 1, b: 2}, no]
		[TreeMap(String)(Number), {node1: 1}, no]
		[TreeMap(String)(Number), {leaf1: 1}, no]
	]
	'doesnt match objects with correct keys but wrong values': [
		[TreeMap(String)(Number), {leaf: null}, no]
		[TreeMap(String)(Number), {node: {a: {leaf: null}}}, no]
		[TreeMap(String)(Number), {
			node: {
				a: {leaf: 1},
				b: {leaf: 'a'}
			}}, no]
		[TreeMap(String)(Number), {
			node: {
				a: {leaf: 1},
				b: {node: {
					c: {leaf: 'a'}
				}}
			}}, no]
	]
	'matches objects with correct keys and values': [
		[TreeMap(String)(Number), {leaf: 1}, yes]
		[TreeMap(String)(Number), {node: {a: {leaf: 1}}}, yes]
		[TreeMap(String)(Number), {
			node: {
				a: {leaf: 1},
				b: {leaf: 2}
			}}, yes]
		[TreeMap(String)(Number), {
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
			}}, yes]
	]

module.exports = {matchCases}
