require 'coffee-mate/global'
{instance} = require '../typeclass'

Int = do ->
	r = `function Int(){}`
	return (r.constructor = r)

instance('TypeSpec')(Int).where
	match: () -> (v) ->
		v? and v.constructor is Number and not isNaN(v) and v == parseInt(v)
	constraints: () -> (v) -> [
		{
			label: -> "Int Excepted, But Got #{json v}"
			flag: -> v? and v.constructor is Number and not isNaN(v) and v == parseInt(v)
		}
	]
	show: () ->
		"Int"
	samples: () ->
		concat repeat [42, 1, 2]

module.exports = {Int}
