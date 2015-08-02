require 'coffee-mate/global'
{instance} = require './typeclass'

#`function Enum(ls){
#	return {
#		constructor: Enum,
#		enum: ls
#	}
#}`

class Enum
	constructor: (ls) ->
		return {
			constructor: Enum
			enum: ls
		}

instance('TypeSpec')(Enum).where
	match: ({enum: vs}) -> (v) ->
		v in vs
	show: ({enum: vs}) ->
		if vs.length > 1 then "Enum [#{json vs[0]} ...]" else "Enum [#{vs[0]}]"
	samples: ({enum: vs}) ->
		concat repeat vs

module.exports = {Enum}
