require 'coffee-mate/global'
{typeclass, instance} = require '../typeclass'
{match, show, samples, sample, htmlInline, htmlBlock} = require '../typespec'
{expandBlockHead, isTypeSpec} = require '../helpers'

class Promise
	constructor: (spec) ->
		unless isTypeSpec(spec)
			throw Error "Bad Optional Type Definition: TypeSpec as spec Expected"

		return {
			constructor: Promise
			spec: spec
		}

instance('TypeSpec')(Promise).where
	match: ({spec}) -> (v) ->
		v?.then?
	withSpec: ({spec}) -> (v) ->
		if not v?.then?
			throw TypeError {expected: 'Promise', got: v}
		else
			return v.then (x) ->
				withSpec(spec)(x)
				return x
	show: ({spec}) ->
		"T.Promise(#{show spec})"
	samples: ({spec}) ->
		samples spec
	htmlInline: ({spec}) ->
		"<span class='type-maker unwrapped'>Promise #{htmlInline spec}</span>"
	htmlBlock: ({spec}) ->
		expandBlockHead((head) ->
			"<span class='type-maker'>Promise #{head}</span>"
		) spec

module.exports = {Promise}
