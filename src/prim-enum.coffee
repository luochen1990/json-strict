require 'coffee-mate/global'
{instance} = require './typeclass'

Enum = (ls) ->
	constructor: Enum
	enum: ls

instance('TypeSpec')(Enum).where
	match: (specification) -> (v) ->
		v in specification.enum
	show: (specification) ->
		if length vs > 1 then "Enum [#{vs[0]} ...]" else "Enum [#{vs[0]}]"

module.exports = {Enum}
