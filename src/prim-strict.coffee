require 'coffee-mate/global'
{instance} = require './typeclass'
{match, show, samples, sample} = require './typespec'

Strict = (specdict) ->
	constructor: Strict
	specdict: specdict

instance('TypeSpec')(Strict).where
	match: ({specdict}) -> (v) ->
		v.constructor is Object and (all((k) -> specdict[k]?) Object.keys(v)) and all(([k, spec]) -> match(spec) v[k]) enumerate(specdict)
	show: ({specdict}) ->
		"Strict #{show spec}"
	samples: ({specdict}) ->
		repeat dict list map(([k, v]) -> [k, sample v]) enumerate(specdict)

module.exports = {Strict}
