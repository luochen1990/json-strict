require 'coffee-mate/global'
{instance} = require '../typeclass'
{show} = require '../typespec'

#`function Enum(ls){
#	return {
#		constructor: Enum,
#		enum: ls
#	}
#}`

class Enum
	constructor: (ls) ->
		if not (all((x) -> x?) ls)
			throw Error "Bad Enum Type Definition: Array Of Non-Null Values Expected, Bot Got #{ls}"
		return {
			constructor: Enum
			enum: ls
		}

instance('TypeSpec')(Enum).where
	match: ({enum: vs}) -> (v) ->
		v in vs
	constraints: (t) ->
		{enum: vs} = t
		(v) -> [
			{
				label: -> "#{show t} Expected, But Got #{json v}"
				flag: -> v in vs
			}
		]
	show: ({enum: vs}) ->
		"T.Enum(#{json vs})"
	samples: ({enum: vs}) ->
		concat repeat vs
	htmlInline: ({enum: vs}) ->
		"<span class='type-maker unwrapped'>Enum #{json vs}</span>"

module.exports = {Enum}
