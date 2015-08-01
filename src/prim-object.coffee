require 'coffee-mate/global'
{instance} = require './typeclass'
{match, show} = require './typespec'

instance('TypeSpec')(Object).where
	match: (specdict) -> (v) ->
		v.constructor is Object and all(([k, spec]) -> match(spec) v[k]) enumerate(specdict)
	show: (specdict) ->
		'{' + (list map(([k, spec]) -> "#{k}: #{show spec}") enumerate(specdict)).join(', ') + '}'

