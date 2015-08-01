require 'coffee-mate/global'
{instance} = require './typeclass'
{match, show} = require './typespec'

Data = ({spec, samples, name, discription}) ->
	if samples? and not all(match(spec)) samples
		log -> spec
		log -> samples
		log -> match(spec) samples[0]
		throw TypeError 'bad samples'

	constructor: Data
	sample: ->
		if samples? then samples[0] else null
	owns: (elem) ->
		match(spec) elem
	spec: spec
	samples: samples
	name: name
	discription: discription

instance('TypeSpec')(Data).where
	match: ({spec}) -> (v) ->
		match(spec) v
	show: ({name, spec}) ->
		name or (show spec)

module.exports = {Data}
