require 'coffee-mate/global'
{instance} = require './typeclass'
{match, show, samples, sample} = require './typespec'

Dict = (spec) ->
	constructor: Dict
	spec: spec

instance('TypeSpec')(Dict).where
	match: ({spec}) -> (v) ->
		v.constructor is Object and all(match spec) map(seek v) Object.keys(v)
	show: ({spec}) ->
		"Dict #{show spec}"
	samples: ({spec}) ->
		ls = list take(4) samples(spec)
		concat repeat [{x: ls[0], y: ls[1]}, {x: ls[2], z: ls[3]}]

module.exports = {Dict}
