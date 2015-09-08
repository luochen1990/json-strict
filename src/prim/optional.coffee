require 'coffee-mate/global'
{typeclass, instance} = require '../typeclass'
{match, show, samples, sample, htmlInline, htmlBlock} = require '../typespec'
{expandBlockHead, isTypeSpec} = require '../helpers'

class Optional
	constructor: (spec) ->
		unless isTypeSpec(spec)
			throw Error "Bad Optional Type Definition: TypeSpec as spec Expected"

		return {
			constructor: Optional
			spec: spec
		}

instance('TypeSpec')(Optional).where
	match: ({spec}) -> (v) ->
		not v? or match(spec) v
	show: ({spec}) ->
		"Optional #{show spec}"
	samples: ({spec}) ->
		ls = list take(2) samples spec
		concat repeat [ls[0], null, ls[1], undefined]
	htmlInline: ({spec}) ->
		"<span class='type-maker unwrapped'>Optional #{htmlInline spec}</span>"
	htmlBlock: ({spec}) ->
		expandBlockHead((head) ->
			"<span class='type-maker'>Optional #{head}</span>"
		) spec

module.exports = {Optional}
