require 'coffee-mate/global'
{typeclass, instance} = require './typeclass'
{match, show, samples, sample, htmlInline, htmlNode} = require './typespec'

class Maybe
	constructor: (spec) ->
		assert -> typeclass('TypeSpec').hasInstance(spec.constructor)
		return {
			constructor: Maybe
			spec: spec
		}

instance('TypeSpec')(Maybe).where
	match: ({spec}) -> (v) ->
		not v? or match(spec) v
	show: ({spec}) ->
		"Maybe #{show spec}"
	samples: ({spec}) ->
		ls = list take(2) samples spec
		concat repeat [ls[0], null, ls[1], undefined]
	htmlInline: ({spec}) ->
		"<span class='type-maker'>Maybe #{htmlInline spec}</span>"
	htmlNode: ({spec}) ->
		node = htmlNode spec
		if not node?
			null
		else
			head: "<span class='type-maker'>Maybe #{node.head}</span>"
			body: node.body
			tail: node.tail

module.exports = {Maybe}
