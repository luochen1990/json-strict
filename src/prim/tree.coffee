require 'coffee-mate/global'
{typeclass, instance} = require '../typeclass'
{match, show, samples, sample, htmlInline, htmlBlock} = require '../typespec'
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
		v? and typeof v is 'object' and v.rootLabel? and v.subForest?.constructor is Array and match(labelSpec)(v.rootLabel) and all(match(t))(v.subForest)
	show: ({labelSpec}) ->
		"Tree #{show labelSpec}"
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
