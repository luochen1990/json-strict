require 'coffee-mate/global'
{typeclass, instance} = require '../typeclass'
{match, constraints, show, samples, sample, htmlInline, htmlBlock} = require '../typespec'
{expandBlockHead, isTypeSpec} = require '../helpers'

class Tree
	constructor: (labelSpec) ->
		unless isTypeSpec(labelSpec)
			throw Error "Bad Tree Type Definition: TypeSpec as labelSpec Expected"

		return {
			constructor: Tree
			labelSpec: labelSpec
		}

instance('TypeSpec')(Tree).where
	match: (t) -> (v) ->
		{labelSpec} = t
		v? and v.rootLabel? and v.subForest? and v.subForest instanceof Array and match(labelSpec)(v.rootLabel) and all(match(t))(v.subForest)
	constraints: (t) ->
		{labelSpec} = t
		(v) -> cons(
			{
				label: -> "#{show t} Expected, But Got #{v}"
				flag: -> v? and v.rootLabel? and v.subForest? and v.subForest instanceof Array
			}
		) cons(
			{
				label: -> "Tree Label" # Expected to be #{show labelSpec}"
				sub: -> constraints(labelSpec)(v.rootLabel)
			}
		)(
			map(([i, x]) ->
				{
					label: -> "Tree Subforest #{i}" #{show t} Expected"
					sub: -> constraints(t)(x)
				}
			) zip(naturals, (v?.subForest ? []))
		)
	show: ({labelSpec}) ->
		"Tree(#{show labelSpec})"
	samples: ({labelSpec}) ->
		ls = list take(2) samples labelSpec
		s0 = {rootLabel: ls[0], subForest: []}
		s1 = {rootLabel: ls[1], subForest: [s0]}
		concat repeat [s0, s1]
	htmlInline: ({labelSpec}) ->
		"<span class='type-maker unwrapped'>Tree #{htmlInline labelSpec}</span>"
	htmlBlock: ({labelSpec}) ->
		expandBlockHead((head) ->
			"<span class='type-maker'>Tree #{head}</span>"
		) labelSpec

module.exports = {Tree}
