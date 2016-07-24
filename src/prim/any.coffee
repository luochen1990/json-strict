require 'coffee-mate/global'
{instance} = require '../typeclass'

Any = do ->
	r = `function Any(){}`
	return (r.constructor = r)

instance('TypeSpec')(Any).where
	match: () -> (v) ->
		v?
	constraints: () -> (v) -> [
		{
			label: -> "Any Non-Null Value Expected, But Got #{v}"
			flag: -> v?
		}
	]
	show: () ->
		"Any"
	samples: () ->
		concat repeat ['a', 3, true, [1, 2], {x: 1}] #, NaN, '', {}, []
	sample: () ->
		'any'

module.exports = {Any}
