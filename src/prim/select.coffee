require 'coffee-mate/global'
{typeclass, instance} = require '../typeclass'
{match, show, samples, sample, htmlInline, htmlBlock} = require '../typespec'
{genBlockBody, isTypeSpecDict} = require '../helpers'

class Select
	constructor: (specs) ->
		unless isTypeSpecDict(specs)
			throw Error "Bad Select Type Definition: TypeSpec as spec Expected"
		unless Object.keys(specs).length >= 1
			throw Error "Bad Select Type Definition: At Least One Selection Should Be Provided"

		return {
			constructor: Select
			specs: specs
		}

instance('TypeSpec')(Select).where
	match: ({specs}) -> (v) ->
		v? and v.constructor is Object and (ks = Object.keys(v)).length is 1 and (spec = specs[(k = ks[0])])? and (match(spec) v[k])
	show: ({specs}) ->
		"T.Select({#{(list map(([k, spec]) -> "#{k}: #{show spec}") enumerate(specs)).join(', ')}})"
	samples: ({specs}) ->
		concat repeat map(([k, v]) -> dict [[k, sample v]]) enumerate(specs)
	htmlInline: ({specs: specdict}) ->
		"<span class='type-maker unwrapped'>Select {<span class='folded-detail'>...</span>}</span>"
	htmlBlock: ({specs: specdict}) ->
		head: "<span class='type-maker'>Select {</span>"
		body: genBlockBody('select', 'field-name') specdict
		tail: "<span class='type-maker'>}</span>"

module.exports = {Select}
