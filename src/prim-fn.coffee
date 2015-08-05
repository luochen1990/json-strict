require 'coffee-mate/global'
{typeclass, instance} = require './typeclass'
{match, show, samples, sample, htmlInline, htmlNode} = require './typespec'

class Fn
	constructor: (ispec) ->
		return (ospec) ->
			constructor: Fn
			ispec: ispec
			ospec: ospec

instance('TypeSpec')(Fn).where
	match: ({ispec, ospec}) -> (v) ->
		v? and v.constructor is Function #TODO: how to be precise ?
	show: ({ispec, ospec}) ->
		"#{show ispec} -> #{show ospec}" #TODO: what about (a -> b) -> c ?
	samples: ({ispec, ospec}) ->
		repeat {"[input]": (sample ispec), "[output]": (sample ospec)}
	htmlInline: ({ispec, ospec}) ->
		"<span class='type-maker'>#{htmlInline ispec} -> #{htmlInline ospec}</span>"
	htmlNode: ({ispec, ospec}) ->
		assert -> typeclass('TypeSpec').hasInstance(ispec.constructor)
		assert -> typeclass('TypeSpec').hasInstance(ospec.constructor)
		lis = map(([k, v]) ->
			node = htmlNode v
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
		) enumerate({input: ispec, output: ospec})
		head: "<span class='type-maker'>Fn (</span>"
		body: "<ul>" + (list lis).join('\n') + "</ul>"
		tail: "<span class='type-maker'>)</span>"

module.exports = {Fn}
