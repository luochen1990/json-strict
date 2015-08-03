require 'coffee-mate/global'
{instance} = require './typeclass'
{match, show, samples, sample, htmlInline, htmlNode} = require './typespec'

instance('TypeSpec')(Object).where
	match: (specdict) -> (v) ->
		v.constructor is Object and all(([k, spec]) -> match(spec) v[k]) enumerate(specdict)
	show: (specdict) ->
		'{' + (list map(([k, spec]) -> "#{k}: #{show spec}") enumerate(specdict)).join(', ') + '}'
	samples: (specdict) ->
		repeat dict list map(([k, v]) -> [k, sample v]) enumerate(specdict)
	htmlInline: (specdict) ->
		"<span>{...}</span>"
	htmlNode: (specdict) ->
		lis = map(([k, v]) ->
			node = htmlNode v
			oneline = "<span class='field-name'>#{k}</span>: #{htmlInline v}"
			if not node?
				"<li>#{oneline}</li>"
			else
				"<li class='#{if v.name? then 'folded' else 'unfolded'}'>\n" +
				"\t<div class='fold'>#{oneline}</div>\n" +
				"\t<div class='unfold'>\n" +
				"\t\t<span class='head'><span class='field-name'>#{k}</span>: #{node.head}</span>\n" +
				"\t\t<div class='body'>#{node.body}</div>\n" +
				"\t\t<span class='tail'>#{node.tail}</span>\n" +
				"\t</div>\n" +
				"</li>"
		) enumerate(specdict)
		head: "<span class='type-maker'>{</span>"
		body: "<ul>" + (list lis).join('\n') + "</ul>"
		tail: "<span class='type-maker'>}</span>"

