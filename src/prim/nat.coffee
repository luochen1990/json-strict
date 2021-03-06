require 'coffee-mate/global'
{instance} = require '../typeclass'

Nat = do ->
	r = `function Nat(){}`
	return (r.constructor = r)

instance('TypeSpec')(Nat).where
	shape: () -> Number
	match: () -> (v) ->
		v? and v.constructor is Number and not isNaN(v) and v >= 0 and v == parseInt(v)
	constraints: () -> (v) -> [
		{
			label: -> "Nat Excepted, But Got #{json v}"
			flag: -> v? and v.constructor is Number and not isNaN(v) and v >= 0 and v == parseInt(v)
		}
	]
	show: () ->
		"Nat"
	samples: () ->
		concat repeat [42, 1, 2]

module.exports = {Nat}
