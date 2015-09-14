require 'coffee-mate/global'
{typeclass, instance} = require '../typeclass'
{match, show, samples, sample, htmlInline, htmlBlock} = require '../typespec'
{genBlockBody, isTypeSpecDict} = require '../helpers'

class Loose
	constructor: (specdict) ->
		unless isTypeSpecDict(specdict)
			throw Error "Bad Loose Type Definition: Dict Of TypeSpec Expected, But Got #{specdict}"
		return {
			constructor: Loose
			specdict: specdict
		}

instance('TypeSpec')(Loose).where
	match: ({specdict}) -> (v) ->
		v? and v.constructor is Object and (all(([k, spec]) -> match(spec) v[k]) enumerate(specdict))
	show: ({specdict}) ->
		"T.Loose({#{(list map(([k, spec]) -> "#{k}: #{show spec}") enumerate(specdict)).join(', ')}})"
	samples: ({specdict}) ->
		repeat dict list map(([k, v]) -> [k, sample v]) enumerate(specdict)
	htmlInline: ({specdict}) ->
		"<span class='type-maker unwrapped'>Loose {<span class='folded-detail'>...</span>}</span>"
	htmlBlock: ({specdict}) ->
		head: "<span class='type-maker'>Loose {</span>"
		body: genBlockBody('loose', 'field-name') specdict
		tail: "<span class='type-maker'>}</span>"

module.exports = {Loose}
