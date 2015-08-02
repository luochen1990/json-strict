require 'coffee-mate/global'
{instance} = require './typeclass'
{match, show, samples, sample} = require './typespec'

class Map
	constructor: (kspec, vspec) ->
		return {
			constructor: Map
			kspec: kspec
			vspec: vspec
		}

instance('TypeSpec')(Map).where
	match: ({kspec, vspec}) -> (v) ->
		v.constructor is Object and all(match spec) map(seek v) Object.keys(v)
	show: ({kspec, vspec}) ->
		"Map #{show kspec} #{show vspec}"
	samples: ({kspec, vspec}) ->
		ks = list take(4) samples(kspec)
		vs = list take(4) samples(vspec)
		concat repeat [dict [[ks[0], vs[0]], [ks[1], vs[1]]], dict [[ks[2], vs[2]], [ks[3], vs[3]]]]

module.exports = {Map}
