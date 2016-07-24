require 'coffee-mate/global'
{typeclass, instance} = require '../typeclass'
{match, constraints, show, samples, sample, htmlInline, htmlBlock} = require '../typespec'
{genBlockBody, isTypeSpec} = require '../helpers'

class TreeMap
	constructor: (kspec) ->
		unless isTypeSpec(kspec)
			throw Error "Bad TreeMap Type Definition: TypeSpec as kspec Expected"

		return (vspec) ->
			unless isTypeSpec(vspec)
				throw Error "Bad TreeMap Type Definition: TypeSpec as vspec Expected"

			constructor: TreeMap
			kspec: kspec
			vspec: vspec

instance('TypeSpec')(TreeMap).where
	match: (t) -> (v) ->
		{kspec, vspec} = t
		mk = match(kspec)
		mv = match(t)
		v? and (
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
	constraints: (t) -> (v) -> cons(
		{
			label: -> "#{show t} Expected, But Got #{v}"
			flag: -> v? and (ks = Object.keys(v)).length == 1 and (tag = ks[0]) in ['node', 'leaf']
		}
	)(
		if not v?
			[]
		else if v.node?
			concat map(([k, v]) -> [
				{
					label: -> "TreeMap Key Expected"
					sub: -> constraints(t.kspec)(k)
				}
				{
					label: -> "#{show t} Expected"
					sub: -> constraints(t)(v)
				}
			]) enumerate(v.node)
		else [
			{
				label: -> "Leaf Expected to be #{show t.vspec}"
				sub: -> constraints(t.vspec)(v.leaf)
			}
		]
	)
	show: ({kspec, vspec}) ->
		"TreeMap(#{show kspec})(#{show vspec})"
	samples: ({kspec, vspec}) ->
		ks = list take(4) samples(kspec)
		vs = list take(3) samples(vspec)
		concat repeat [{node: dict([[ks[0], {node: dict([[ks[2], {leaf: vs[0]}], [ks[3], {leaf: vs[1]}]])}], [ks[1], {leaf: vs[2]}]])}]
	htmlInline: ({kspec, vspec}) ->
		"<span class='type-maker unwrapped'>TreeMap #{htmlInline kspec} #{htmlInline vspec}</span>"
	htmlBlock: ({kspec, vspec}) ->
		head: "<span class='type-maker'>TreeMap (</span>"
		body: genBlockBody('treemap', 'meta-field') {key: kspec, value: vspec}
		tail: "<span class='type-maker'>)</span>"

module.exports = {TreeMap}
