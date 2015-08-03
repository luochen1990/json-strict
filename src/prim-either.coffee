require 'coffee-mate/global'
{instance} = require './typeclass'
{match, show, samples, sample, htmlInline, htmlNode} = require './typespec'

class Either
	constructor: (specs) ->
		return {
			constructor: Either
			specs: specs
		}

instance('TypeSpec')(Either).where
	match: ({specs}) -> (v) ->
		v.constructor is Object and (ks = Object.keys(v)).length is 1 and (spec = specs[ks[0]])? and match(spec) v
	show: ({specs}) ->
		'Either {' + (list map(([k, spec]) -> "#{k}: #{show spec}") enumerate(specdict)).join(', ') + '}'
	samples: ({specs}) ->
		concat repeat map(([k, v]) -> dict [[k, sample v]]) enumerate(specs)

module.exports = {Either}
