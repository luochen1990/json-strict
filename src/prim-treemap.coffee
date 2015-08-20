require 'coffee-mate/global'
{typeclass, instance} = require './typeclass'
{match, show, samples, sample, htmlInline, htmlBlock} = require './typespec'
{genBlockBody} = require './helpers'

class TreeMap
	constructor: (kspec, vspec) ->
		assert -> typeclass('TypeSpec').hasInstance(kspec.constructor)
		assert -> typeclass('TypeSpec').hasInstance(vspec.constructor)
		return {
			constructor: TreeMap
			kspec: kspec
			vspec: vspec
		}

instance('TypeSpec')(TreeMap).where
	match: (t) -> (v) ->
		{kspec, vspec} = t
		mk = match(kspec)
		mv = match(t)
		v? and v.constructor is Object and (
			(
				(
					(tag = Object.keys(v)[0]) is 'node'
				) and (
					all(mk)(ks = Object.keys(v.node)) and all(mv)(map(seek v.node) ks)
				)
			) or (
				tag is 'leaf' and match(vspec)(v.leaf)
			)
		)
	show: ({kspec, vspec}) ->
		"TreeMap #{show kspec} #{show vspec}"
	samples: ({kspec, vspec}) ->
		ks = list take(4) samples(kspec)
		vs = list take(3) samples(vspec)
		concat repeat [dict([[ks[0], dict([[ks[2], vs[0]], [ks[3], vs[1]]])], [ks[1], vs[2]]])]
	htmlInline: ({kspec, vspec}) ->
		"<span class='type-maker unwrapped'>TreeMap #{htmlInline kspec} #{htmlInline vspec}</span>"
	htmlBlock: ({kspec, vspec}) ->
		head: "<span class='type-maker'>TreeMap (</span>"
		body: genBlockBody('treemap', 'meta-field') {key: kspec, value: vspec}
		tail: "<span class='type-maker'>)</span>"

module.exports = {TreeMap}
