require 'coffee-mate/global'
{instance} = require './typeclass'
{match, show, samples, sample, htmlInline, htmlBlock} = require './typespec'
{genBlockBody} = require './helpers'

instance('TypeSpec')(Object).where
	match: (specdict) -> (v) ->
		v? and v.constructor is Object and (all((k) -> specdict[k]?) Object.keys(v)) and all(([k, spec]) -> match(spec) v[k]) enumerate(specdict)
	show: (specdict) ->
		'{' + (list map(([k, spec]) -> "#{k}: #{show spec}") enumerate(specdict)).join(', ') + '}'
	samples: (specdict) ->
		repeat dict list map(([k, v]) -> [k, sample v]) enumerate(specdict)
	htmlInline: (specdict) ->
		"<span class='type-maker'>{<span class='folded-detail'>...</span>}</span>"
	htmlBlock: (specdict) ->
		head: "<span class='type-maker'>{</span>"
		body: genBlockBody('object', 'field-name') specdict
		tail: "<span class='type-maker'>}</span>"

