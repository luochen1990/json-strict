require 'coffee-mate/global'
{typeclass, instance} = require './typeclass'
{match, show, samples, sample, htmlInline, htmlBlock} = require './typespec'

class Map
	constructor: (kspec, vspec) ->
		return {
			constructor: Map
			kspec: kspec
			vspec: vspec
		}

instance('TypeSpec')(Map).where
	match: ({kspec, vspec}) -> (v) ->
		v? and v.constructor is Object and (all(match spec) map(seek v) Object.keys(v))
	show: ({kspec, vspec}) ->
		"Map #{show kspec} #{show vspec}"
	samples: ({kspec, vspec}) ->
		ks = list take(4) samples(kspec)
		vs = list take(4) samples(vspec)
		concat repeat [dict([[ks[0], vs[0]], [ks[1], vs[1]]]), dict([[ks[2], vs[2]], [ks[3], vs[3]]])]
	htmlInline: ({kspec, vspec}) ->
		"<span class='type-maker'>Map #{htmlInline kspec} #{htmlInline vspec}</span>"
	htmlBlock: ({kspec, vspec}) ->
		assert -> typeclass('TypeSpec').hasInstance(kspec.constructor)
		assert -> typeclass('TypeSpec').hasInstance(vspec.constructor)
		lis = map(([k, v]) ->
			node = htmlBlock v
			oneline = "<span class='meta-field'>#{k}</span>: #{htmlInline v}"
			if not node?
				"<li>#{oneline}</li>"
			else
				#"<li class='#{if v.name? then 'folded' else 'unfolded'}'>\n" +
				"<li>\n" +
				"\t<div class='fold'>#{oneline}</div>\n" +
				"\t<div class='unfold'>\n" +
				"\t\t<span class='meta-field'>#{k}</span>: #{node.head}\n" +
				"\t\t#{node.body ? ''}\n" +
				"\t\t#{node.tail ? ''}\n" +
				"\t</div>\n" +
				"</li>"
		) enumerate({key: kspec, value: vspec})
		head: "<span class='type-maker'>Map (</span>"
		body: "<ul>" + (list lis).join('\n') + "</ul>"
		tail: "<span class='type-maker'>)</span>"

module.exports = {Map}
