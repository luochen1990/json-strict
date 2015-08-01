require 'coffee-mate/global'
{instance} = require './typeclass'

Any = do ->
	r = (->)
	return (r.constructor = r)

instance('TypeSpec')(Any).where
	match: (specification) -> (v) ->
		true
	show: (specification) ->
		"Any"

module.exports = {Any}
