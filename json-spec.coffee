module.exports = {Data, Either, Enum, Maybe, Bool, Number, String, Dict, Strict, Any}
require 'coffee-mate/global'

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

#class TypeSpec a where
#	match :: a -> Dynamic -> Bool
#	show :: a -> String
#	showHtml :: a -> Html
#	displayName :: a -> Maybe String
#	discription :: a -> Maybe String
#	sample :: a -> Dynamic
#	samples :: a -> [Dynamic]
#
#instance TypeSpec Enum where
#	match (Enum vs) v = v `elem` vs
#	show (Enum vs) = if length vs > 1 then "Enum [#{vs[0]} ...]" else "Enum [#{vs[0]}]"
#	displayName (Enum _) = Nothing
#
#instance TypeSpec Bool where
#	match Bool v = v `elem` [true, false]
#	show Bool = "Bool"
#	displayName Bool = Nothing
#
#instance TypeSpec Number where
#	match Number v = typeof v is 'number' or v.constructor is Prim.Number
#	show Number = "Number"
#	displayName Number = Nothing
#
#instance TypeSpec String where
#	match String v = s.constructor is Prim.String
#	show String = "String"
#	displayName String = Nothing
#
#instance TypeSpec Maybe where
#	match (Maybe spec) v = not v? or match spec v
#	show (Maybe spec) = "Maybe #{show spec}"
#	displayName (Maybe _) = Nothing
#
#instance TypeSpec Either where
#	match (Either specs) v = (ks = Object.keys(v)).length is 1 and (spec = specs[ks[0]])? and match(spec) v
#
#instance TypeSpec Dict where
#	match (Dict spec) v = all(match spec) map(seek v) Object.keys(v)
#
#instance TypeSpec {k1: spec1, k2: spec2 ...} where
#	match specobj v = Object.keys(specobj) == Object.keys(v) and all id [match spec v[k] | (k, spec) <- specobj]
#	show specobj = '{' + ["#{k}: #{show spec}" for (k, spec) in specobj].join(', ') + '}'
#	displayName {_} = Nothing
#
#instance TypeSpec [spec] where
#	match [spec] v = all(match spec) v
#	show specobj = "[#{show spec}]"
#	displayName [_] = Nothing
#
#instance TypeSpec Data where
#	match (Data {spec: spec}) v = match spec v
#	show (Data d) v = d.name ? show d.spec
#	displayName (Data d) = d.name

# spec: {k1: spec1, k2: spec2 ...} | [spec] | Data {spec: spec, samples: [], ...}

match = (specification) -> (v) ->
	if specification.constructor isnt Maybe and not v?
		false
	else
		switch specification.constructor
			when Function
				switch specification
					when Boolean
						v in [true, false]
					when Number
						typeof v is 'number' or v.constructor is Number
					when String
						v.constructor is String
					else
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

Name = Data
	spec: String
	samples: ['abc', 'a123']

log -> 'abc'.constructor
log -> 'abc'.constructor is String
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

