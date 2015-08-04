require 'coffee-mate/global'
{typeclass} = require './typeclass'

TypeSpec = typeclass('TypeSpec').where
	match: null
	show: null
	samples: null
	sample: (t) -> head @samples(t)
	htmlInline: (t) ->
		"<span class='type-maker'>#{@show t}</span>"
	htmlNode: (t) -> null
	showHtml: (t) ->
		node = @htmlNode t
		content =
			if not node?
				@htmlInline t
			else
				"<div class='fold'><span class='spliter'>spec:</span>#{@htmlInline t}</div>" +
				"<div class='unfold'>" +
				"<span class='spliter'>spec:</span>#{node.head}" +
				"#{node.body ? ''}" +
				"#{node.tail ? ''}" +
				"</div>"
		sample = json(@sample(t), 4)
		return "<div class='typespec'>" +
		"<div class='spec'>" +
		#(if t.name? then "<span class='type-name'>#{t.name}</span>" else '') +
		#"<span class='spliter'>spec:</span>" +
		content.replace(/(\t|\n)/g, '') +
		"</div>\n" +
		"<div class='sample'>\n" +
		"<span class='spliter'>sample:</span>" +
		(if /\n/.test sample then "<pre>#{sample}</pre>" else "<span>#{sample}</span>") +
		"</div>" +
		"</div>"

module.exports = TypeSpec

