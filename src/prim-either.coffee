require 'coffee-mate/global'
{typeclass, instance} = require './typeclass'
{match, show, samples, sample, htmlInline, htmlNode} = require './typespec'

class Either
	constructor: (specs) ->
		assert -> all(([k, spec]) -> typeclass('TypeSpec').hasInstance(spec.constructor)) enumerate(specs)
		return {
			constructor: Either
			specs: specs
		}

instance('TypeSpec')(Either).where
	match: ({specs}) -> (v) ->
		v? and v.constructor is Object and (ks = Object.keys(v)).length is 1 and (spec = specs[ks[0]])? and (match(spec) v)
	show: ({specs}) ->
		'Either {' + (list map(([k, spec]) -> "#{k}: #{show spec}") enumerate(specs)).join(', ') + '}'
	samples: ({specs}) ->
		concat repeat map(([k, v]) -> dict [[k, sample v]]) enumerate(specs)
	htmlNode: ({specs: specdict}) ->
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
		head: "<span class='type-maker'>Either {</span>"
		body: "<ul>" + (list lis).join('\n') + "</ul>"
		tail: "<span class='type-maker'>}</span>"

module.exports = {Either}
