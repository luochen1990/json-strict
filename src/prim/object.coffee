require 'coffee-mate/global'
{instance} = require '../typeclass'
{match, show, samples, sample, htmlInline, htmlBlock} = require '../typespec'
{genBlockBody, isTypeSpecDict} = require '../helpers'

specdictChecked = (f) ->
	(specdict) ->
		unless isTypeSpecDict(specdict)
			throw Error "Bad Object Type Definition: Dict Of TypeSpec Expected, But Got #{specdict}"
		return f(specdict)

instance('TypeSpec')(Object).where
	match: specdictChecked (specdict) -> (v) ->
		v? and v.constructor is Object and (all((k) -> specdict[k]?) Object.keys(v)) and all(([k, spec]) -> match(spec) v[k]) enumerate(specdict)
	show: specdictChecked (specdict) ->
		"{#{(list map(([k, spec]) -> "#{k}: #{show spec}") enumerate(specdict)).join(', ')}}"
	samples: specdictChecked (specdict) ->
		repeat dict list map(([k, v]) -> [k, sample v]) enumerate(specdict)
	htmlInline: specdictChecked (specdict) ->
		"<span class='type-maker'>{<span class='folded-detail'>...</span>}</span>"
	htmlBlock: specdictChecked (specdict) ->
		head: "<span class='type-maker'>{</span>"
		body: genBlockBody('object', 'field-name') specdict
		tail: "<span class='type-maker'>}</span>"

