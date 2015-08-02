require 'coffee-mate/global'
{instance} = require './typeclass'
{match, show, samples, sample} = require './typespec'

Data = ({spec, samples, name, discription}) ->
	if not spec?
		throw ReferenceError 'spec must be specified for a Data declaration'
	if samples? and not all(match(spec))(take(100) samples)
		log -> spec
		log -> samples
		log -> match(spec) samples[0]
		throw TypeError 'bad samples'

	constructor: Data
	spec: spec
	samples: samples
	name: name
	discription: discription

instance('TypeSpec')(Data).where
	match: ({spec}) -> (v) ->
		match(spec) v
	show: ({name, spec}) ->
		name or (show spec)
	samples: ({spec, samples: ls}) ->
		if ls? then concat repeat ls else samples spec

module.exports = {Data}
