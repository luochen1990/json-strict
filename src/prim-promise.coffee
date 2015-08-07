require 'coffee-mate/global'
{typeclass, instance} = require './typeclass'
{match, show, samples, sample, htmlInline, htmlBlock} = require './typespec'

class Promise
	constructor: (spec) ->
		assert -> typeclass('TypeSpec').hasInstance(spec.constructor)
		return {
			constructor: Promise
			spec: spec
		}

instance('TypeSpec')(Promise).where
	match: ({spec}) -> (v) ->
		match(spec)(v)
	show: ({spec}) ->
		"Promise #{show spec}"
	samples: ({spec}) ->
		samples spec
	htmlInline: ({spec}) ->
		"<span class='type-maker unwrapped'>Promise #{htmlInline spec}</span>"
	htmlBlock: ({spec}) ->
		node = htmlBlock spec
		if not node?
			null
		else
			head: "<span class='type-maker'>Promise #{node.head}</span>"
			body: node.body
			tail: node.tail

module.exports = {Promise}
