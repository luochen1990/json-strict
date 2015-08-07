require 'coffee-mate/global'
{typeclass, instance} = require './typeclass'
{match, show, samples, sample, htmlInline, htmlBlock} = require './typespec'
{genBlockBody} = require './helpers'

class Either
	constructor: (specs) ->
		assert -> all(([k, spec]) -> typeclass('TypeSpec').hasInstance(spec.constructor)) enumerate(specs)
		return {
			constructor: Either
			specs: specs
		}

instance('TypeSpec')(Either).where
	match: ({specs}) -> (v) ->
		v? and v.constructor is Object and (ks = Object.keys(v)).length is 1 and (spec = specs[ks[0]])? and (match(spec) v)
	show: ({specs}) ->
		'Either {' + (list map(([k, spec]) -> "#{k}: #{show spec}") enumerate(specs)).join(', ') + '}'
	samples: ({specs}) ->
		concat repeat map(([k, v]) -> dict [[k, sample v]]) enumerate(specs)
	htmlInline: ({specs: specdict}) ->
		"<span class='type-maker unwrapped'>Either {<span class='folded-detail'>...</span>}</span>"
	htmlBlock: ({specs: specdict}) ->
		head: "<span class='type-maker'>Either {</span>"
		body: genBlockBody('either', 'field-name') specdict
		tail: "<span class='type-maker'>}</span>"

module.exports = {Either}
