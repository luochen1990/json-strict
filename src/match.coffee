require 'coffee-mate/global'
{Number, String, Bool, Any, Enum, Maybe, Either, Dict, Strict, Data} = require './primitives'

match = (specification) -> (v) ->
	if specification.constructor isnt Maybe and not v?
		false
	else
		switch specification.constructor
			when Function
				v.constructor is specification
			when Enum
				v in specification.enum
			when Maybe
				{spec} = specification
				not v? or match(spec) v
			when Either
				{specs} = specification
				v.constructor is Object and (ks = Object.keys(v)).length is 1 and (spec = specs[ks[0]])? and match(spec) v
			when Dict
				{spec} = specification
				v.constructor is Object and all(match spec) map(seek v) Object.keys(v)
			when Strict
				{specdict} = specification
				v.constructor is Object and (all((k) -> specdict[k]?) Object.keys(v)) and all(([k, spec]) -> match(spec) v[k]) enumerate(specdict)
			when Object
				specdict = specification
				v.constructor is Object and all(([k, spec]) -> match(spec) v[k]) enumerate(specdict)
			when Array
				[spec] = specification
				v.constructor is Array and all(match spec) v
			when Data
				{spec} = specification
				match(spec) v
			when Any
				true

module.exports = {match}

if module.parent is null
	Name = Data
		spec: String
		samples: ['abc', 'a123']

	log -> match(String) 'abc'
	log -> match(Name) 'abc'
	log -> match(Name) 1
	t = Strict
		x: Number
		y: Maybe Number

	log -> match(t) {x: 1, y: 2}
	log -> match(t) {x: 1, y: 'a'}
	log -> match(t) {x: 1}
	log -> match(t) {x: 1, y: 2, z: 3}

