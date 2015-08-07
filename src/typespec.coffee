require 'coffee-mate/global'
{typeclass} = require './typeclass'
#{Data} = require './index'

TypeSpec = typeclass('TypeSpec').where
	match: null
	show: null
	samples: null
	sample: (t) -> head @samples(t)
	htmlInline: (t) ->
		"<span class='type-maker'>#{@show t}</span>"
	htmlBlock: (t) -> null
	showHtml: (t) ->
		specPart = do =>
			block = @htmlBlock t
			if not block?
				r = @htmlInline t
			else
				r = "<div class='spec'>" +
				"<div class='fold'><span class='meta-field'>spec</span>: #{@htmlInline t}</div>" +
				"<div class='unfold'>" +
				"<span class='meta-field'>spec</span>: #{block.head}" +
				"#{block.body ? ''}" +
				"#{block.tail ? ''}" +
				"</div>" +
				"</div>"
			return r.replace(/(\t|\n)/g, '')

		samplePart = do =>
			sample = json(@sample(t), 4)
			"<div class='sample'>\n" +
			"<span class='meta-field'>sample</span>: " +
			(if /\n/.test sample then "<pre>#{sample}</pre>" else "<span>#{sample}</span>") +
			"</div>"

		return "<div class='typespec'>" +
			specPart + samplePart +
			"</div>"

module.exports = TypeSpec

