require 'coffee-mate/global'
{instance} = require '../typeclass'

Any = do ->
	r = `function Any(){}`
	return (r.constructor = r)

instance('TypeSpec')(Any).where
	match: () -> (v) ->
		v?
	show: () ->
		"T.Any"
	samples: () ->
		concat repeat ['a', 3, true, [1, 2], {x: 1}] #, NaN, '', {}, []
	sample: () ->
		'any'

module.exports = {Any}
