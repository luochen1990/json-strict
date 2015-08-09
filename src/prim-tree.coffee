require 'coffee-mate/global'
{typeclass, instance} = require './typeclass'
{match, show, samples, sample, htmlInline, htmlBlock} = require './typespec'
{expandBlockHead} = require './helpers'

class Tree
	constructor: (labelSpec) ->
		assert -> typeclass('TypeSpec').hasInstance(labelSpec.constructor)
		return {
			constructor: Tree
			labelSpec: labelSpec
		}

instance('TypeSpec')(Tree).where
	match: ({labelSpec}) -> (v) ->
		v? and typeof v is 'object' and match(labelSpec)(v.rootLabel) and all(match labelSpec)(map(pluck 'rootLabel') v.subForest)
	show: ({labelSpec}) ->
		"Tree #{show labelSpec}"
	samples: ({labelSpec}) ->
		ls = list take(2) samples labelSpec
		repeat {rootLabel: ls[0], subForest: [ls[1]]}
	htmlInline: ({labelSpec}) ->
		"<span class='type-maker unwrapped'>Tree #{htmlInline labelSpec}</span>"
	htmlBlock: ({labelSpec}) ->
		expandBlockHead((head) ->
			"<span class='type-maker'>Tree #{head}</span>"
		) labelSpec

module.exports = {Tree}
