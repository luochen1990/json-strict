require 'coffee-mate/global'
{instance} = require './typeclass'

Any = do ->
	r = (->)
	return (r.constructor = r)

instance('TypeSpec')(Any).where
	match: (specification) -> (v) ->
		v?
	show: (specification) ->
		"Any"
	samples: (specification) ->
		concat repeat ['a', 3, true, [1, 2], {x: 1}, NaN, '', {}, []]

module.exports = {Any}
