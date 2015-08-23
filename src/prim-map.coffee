require 'coffee-mate/global'
{typeclass, instance} = require './typeclass'
{match, show, samples, sample, htmlInline, htmlBlock} = require './typespec'
{genBlockBody} = require './helpers'

class Map
	constructor: (kspec) ->
		assert -> typeclass('TypeSpec').hasInstance(kspec.constructor)
		return (vspec) ->
			assert -> typeclass('TypeSpec').hasInstance(vspec.constructor)
			constructor: Map
			kspec: kspec
			vspec: vspec

instance('TypeSpec')(Map).where
	match: ({kspec, vspec}) -> (v) ->
		mk = match(kspec)
		mv = match(vspec)
		v? and v.constructor is Object and all(mk)(ks = Object.keys(v)) and all(mv)(map(seek v) ks)
	show: ({kspec, vspec}) ->
		"Map #{show kspec} #{show vspec}"
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
