mate = require 'coffee-mate'
{expect} = require('chai')
helpers = mate.dict([k, mate[k]] for k in ['log', 'assert', 'assertEq', 'assertEqOn', 'json', 'int', 'str'])

objectId = do ->
	mem = []
	f = (obj) ->
		r = mem.indexOf(obj)
		if r is -1
			r = mem.length
			mem.push obj
		return r
	f.reset = -> mem = []
	return f

each = (arr) ->
	(list map(objectId) arr).join(',')

plus = (x, y) -> x + y

mate.extend((if window? then window else global)) helpers, {objectId, each, plus, expect}



{unmatchMessages, match, show} = require '../src/'
{OneOf} = require '../src/'
t = OneOf([Number, String])
log -> match(t)(true)

