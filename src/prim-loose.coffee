require 'coffee-mate/global'
{typeclass, instance} = require './typeclass'
{match, show, samples, sample, htmlInline, htmlNode} = require './typespec'

class Loose
	constructor: (specdict) ->
		assert -> all(([k, spec]) -> typeclass('TypeSpec').hasInstance(spec.constructor)) enumerate(specdict)
		return {
			constructor: Loose
			specdict: specdict
		}

instance('TypeSpec')(Loose).where
	match: (specdict) -> (v) ->
		v? and v.constructor is Object and (all(([k, spec]) -> match(spec) v[k]) enumerate(specdict))
	show: ({specdict}) ->
		'Loose {' + (list map(([k, spec]) -> "#{k}: #{show spec}") enumerate(specdict)).join(', ') + '}'
	samples: ({specdict}) ->
		repeat dict list map(([k, v]) -> [k, sample v]) enumerate(specdict)
	htmlInline: ({specdict}) ->
		"<span class='type-maker'>Loose {...}</span>"
	htmlNode: ({specdict}) ->
		lis = map(([k, v]) ->
			node = htmlNode v
			oneline = "<span class='field-name'>#{k}</span>: #{htmlInline v}"
			if not node?
				"<li>#{oneline}</li>"
			else
				#"<li class='#{if v.name? then 'folded' else 'unfolded'}'>\n" +
				"<li>\n" +
				"\t<div class='fold'>#{oneline}</div>\n" +
				"\t<div class='unfold'>\n" +
				"\t\t<span class='field-name'>#{k}</span>: #{node.head}\n" +
				"\t\t#{node.body ? ''}\n" +
				"\t\t#{node.tail ? ''}\n" +
				"\t</div>\n" +
				"</li>"
		) enumerate(specdict)
		head: "<span class='type-maker'>Loose {</span>"
		body: "<ul>" + (list lis).join('\n') + "</ul>"
		tail: "<span class='type-maker'>}</span>"

module.exports = {Loose}
