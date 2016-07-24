require 'coffee-mate/global'
{typeclass, instance} = require '../typeclass'
{match, constraints, show, samples, sample, htmlInline, htmlBlock} = require '../typespec'
{genBlockBody} = require '../helpers'

class Map
	constructor: (kspec) ->
		unless kspec? and typeclass('TypeSpec').hasInstance(kspec.constructor)
			throw Error "Bad Fn Definition: TypeSpec as kspec Expected, But Got #{kspec}"
		return (vspec) ->
			unless vspec? and typeclass('TypeSpec').hasInstance(vspec.constructor)
				throw Error "Bad Fn Definition: TypeSpec as vspec Expected, But Got #{vspec}"
			constructor: Map
			kspec: kspec
			vspec: vspec

instance('TypeSpec')(Map).where
	match: ({kspec, vspec}) -> (v) ->
		mk = match(kspec)
		mv = match(vspec)
		v? and v.constructor is Object and all(mk)(ks = Object.keys(v)) and all(mv)(map(seek v) ks)
	constraints: ({kspec, vspec}) ->
		(v) -> cons(
			{
				label: -> "Object Expected, But Got #{v}"
				flag: -> v? and v.constructor is Object
			}
		) concat [(
			map((k) -> {
				label: -> "Key #{json k}" #Expected to be #{show kspec}"#, But Got #{json k}"
				sub: -> constraints(kspec)(k)
			}) Object.keys(v ? [])
		), (
			map((k) -> {
				label: -> "Key #{json k} 's Value " #Expected to be #{show vspec}" #, But Got #{json v}"
				sub: -> constraints(vspec)(v[k])
			}) Object.keys(v ? [])
		)]
	show: ({kspec, vspec}) ->
		"Map(#{show kspec})(#{show vspec})"
	samples: ({kspec, vspec}) ->
		ks = list take(4) samples(kspec)
		vs = list take(4) samples(vspec)
		concat repeat [dict([[ks[0], vs[0]], [ks[1], vs[1]]]), dict([[ks[2], vs[2]], [ks[3], vs[3]]])]
	htmlInline: ({kspec, vspec}) ->
		"<span class='type-maker unwrapped'>Map #{htmlInline kspec} #{htmlInline vspec}</span>"
	htmlBlock: ({kspec, vspec}) ->
		head: "<span class='type-maker'>Map (</span>"
		body: genBlockBody('map', 'meta-field') {key: kspec, value: vspec}
		tail: "<span class='type-maker'>)</span>"

module.exports = {Map}
