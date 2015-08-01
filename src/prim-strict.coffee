require 'coffee-mate/global'
{instance} = require './typeclass'

Strict = (specdict) ->
	constructor: Strict
	specdict: specdict

instance('TypeSpec')(Strict).where
	match: ({specdict}) -> (v) ->
		v.constructor is Object and (all((k) -> specdict[k]?) Object.keys(v)) and all(([k, spec]) -> match(spec) v[k]) enumerate(specdict)
	show: ({specdict}) ->
		"Strict #{show spec}"

module.exports = {Strict}
