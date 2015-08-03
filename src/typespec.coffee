require 'coffee-mate/global'
{typeclass} = require './typeclass'

TypeSpec = typeclass('TypeSpec').where
	match: null
	show: null
	samples: null
	sample: (t) -> head @samples(t)
	htmlInline: null
	htmlNode: null
	showHtml: (t) ->
		node = @htmlNode t
		content =
			if not node?
				@htmlInline t
			else
				"\t<div>\n" +
				"\t\t<div class='head'>#{node.head}</div>\n" +
				"\t\t<div class='body'>#{node.body}</div>\n" +
				"\t\t<div class='tail'>#{node.tail}</div>\n" +
				"\t</div>\n"
		return "<div class='typespec'>\n" + content + "</div>"

module.exports = TypeSpec

