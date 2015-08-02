require 'coffee-mate/global'
{instance} = require './typeclass'
{match, show, samples, sample} = require './typespec'

class Maybe
	constructor: (spec) ->
		return {
			constructor: Maybe
			spec: spec
		}

instance('TypeSpec')(Maybe).where
	match: ({spec}) -> (v) ->
		not v? or match(spec) v
	show: ({spec}) ->
		"Maybe #{show spec}"
	samples: ({spec}) ->
		ls = list take(2) samples spec
		concat repeat [null, ls[0], undefined, ls[1]]

module.exports = {Maybe}
