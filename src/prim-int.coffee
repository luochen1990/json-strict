require 'coffee-mate/global'
{instance} = require './typeclass'

Int = do ->
	r = `function Int(){}`
	return (r.constructor = r)

instance('TypeSpec')(Int).where
	match: () -> (v) ->
		v? and not isNaN(v) and int(v)?
	show: () ->
		"Int"
	samples: () ->
		concat repeat [42, 1, 2]

module.exports = {Int}
