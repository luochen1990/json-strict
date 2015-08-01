require 'coffee-mate/global'
{instance} = require './typeclass'

Either = (specs) ->
	constructor: Either
	specs: specs

instance('TypeSpec')(Either).where
	match: ({specs}) -> (v) ->
		v.constructor is Object and (ks = Object.keys(v)).length is 1 and (spec = specs[ks[0]])? and match(spec) v
	show: (specification) ->
		if length vs > 1 then "Enum [#{vs[0]} ...]" else "Enum [#{vs[0]}]"

module.exports = {Either}
