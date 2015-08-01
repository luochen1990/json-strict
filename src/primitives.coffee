{match} = require './match'

Bool = Boolean

Any = do ->
	r = (->)
	return (r.constructor = r)

Enum = (ls) ->
	constructor: Enum
	enum: ls

Maybe = (spec) ->
	constructor: Maybe
	spec: spec

Either = (specs) ->
	constructor: Either
	specs: specs

Dict = (spec) ->
	constructor: Dict
	spec: spec

Strict = (specdict) ->
	constructor: Strict
	specdict: specdict

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

module.exports = {Number, String, Bool, Any, Enum, Maybe, Either, Dict, Strict, Data}
