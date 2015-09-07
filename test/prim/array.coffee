{match, show} = require '../../src/'

describe 'prim/Array', ->
	describe 'match', ->
		it 'doesnt match undefined/null', ->
			assert -> match([Number])(undefined) is no
			assert -> match([Number])(null) is no
		it 'doesnt match values of any other types', ->
			assert -> match([Number])(true) is no
			assert -> match([Number])(1) is no
			assert -> match([Number])('c') is no
			assert -> match([Number])({}) is no
		it 'doesnt match array with undefined/null element', ->
			assert -> match([Number])([null]) is no
			assert -> match([Number])([undefined]) is no
			assert -> match([Number])([null, 1]) is no
			assert -> match([Number])([undefined, 1]) is no
			assert -> match([Number])([null, 'a']) is no
			assert -> match([Number])([undefined, 'a']) is no
			assert -> match([Number])([1, null]) is no
			assert -> match([Number])([1, undefined]) is no
			assert -> match([Number])(['a', null]) is no
			assert -> match([Number])(['a', undefined]) is no
			assert -> match([Number])([null, null]) is no
			assert -> match([Number])([undefined, undefined]) is no
		it 'doesnt match array with wrong element', ->
			assert -> match([Number])(['a']) is no
			assert -> match([Number])([[1]]) is no
			assert -> match([Number])([1, 'a']) is no
			assert -> match([Number])([1, 'a', 2]) is no
		it 'matches array with correct elements', ->
			assert -> match([Number])([]) is yes
			assert -> match([Number])([1]) is yes
			assert -> match([Number])([1, 2, 100]) is yes

