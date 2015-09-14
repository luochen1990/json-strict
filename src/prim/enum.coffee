require 'coffee-mate/global'
{instance} = require '../typeclass'

#`function Enum(ls){
#	return {
#		constructor: Enum,
#		enum: ls
#	}
#}`

class Enum
	constructor: (ls) ->
		if not (all((x) -> x?) ls)
			throw Error "Bad Enum Type Definition: Array Of Non-null Values Expected, Bot Got #{ls}"
		return {
			constructor: Enum
			enum: ls
		}

instance('TypeSpec')(Enum).where
	match: ({enum: vs}) -> (v) ->
		v in vs
	show: ({enum: vs}) ->
		"T.Enum(#{json vs})"
	samples: ({enum: vs}) ->
		concat repeat vs
	htmlInline: ({enum: vs}) ->
		"<span class='type-maker unwrapped'>Enum #{json vs}</span>"

module.exports = {Enum}
