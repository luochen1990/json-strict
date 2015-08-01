require 'coffee-mate/global'
{instance} = require './typeclass'

Enum = (ls) ->
	constructor: Enum
	enum: ls

instance('TypeSpec')(Enum).where
	match: ({enum: vs}) -> (v) ->
		v in vs
	show: ({enum: vs}) ->
		if vs.length > 1 then "Enum [#{json vs[0]} ...]" else "Enum [#{vs[0]}]"

module.exports = {Enum}
