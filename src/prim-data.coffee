require 'coffee-mate/global'
{instance} = require './typeclass'
{match, show, samples, sample} = require './typespec'

class Data
	constructor: ({spec, check, name, samples, discription}) ->
		if not spec?
			throw ReferenceError 'spec must be specified for a Data declaration'
		if samples? and not all(match(spec))(take(100) samples)
			log -> spec
			log -> samples
			log -> match(spec) samples[0]
			throw TypeError 'bad samples'

		return {
			constructor: Data
			spec
			check
			name
			samples
			discription
		}

instance('TypeSpec')(Data).where
	match: ({spec, check}) -> (v) ->
		match(spec)(v) and (if check? then check(v) else true)
	show: ({name, spec}) ->
		name or (show spec)
	samples: ({spec, samples: ls}) ->
		if ls? then concat repeat ls else samples spec

module.exports = {Data}
