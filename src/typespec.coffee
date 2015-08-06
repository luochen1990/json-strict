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
	htmlNode: (t) -> null
	showHtml: (t) ->
		#if t.constructor is Data
		if t.name?
			{name, description, spec, check} = t
			if check?
				check = check.toString()
			log -> description
		else
			spec = t

		namePart = if not name? then '' else
			"<div class='name'>" +
			"<span class='meta-field'>name:</span>" +
			"<span class='type-name'>#{name}</span>" +
			"</div>"

		descriptionPart = if not description? then '' else
			"<div class='desc'>" +
			"<span class='meta-field'>description:</span>" +
			(if /\n/.test description then "<pre>#{description}</pre>" else "<span>#{description}</span>") +
			"</div>"

		specPart = do =>
			block = @htmlNode spec
			if not block?
				r = @htmlInline spec
			else
				r = "<div class='spec'>" +
				"<div class='fold'><span class='meta-field'>specification:</span>#{@htmlInline spec}</div>" +
				"<div class='unfold'>" +
				"<span class='meta-field'>specification:</span>#{block.head}" +
				"#{block.body ? ''}" +
				"#{block.tail ? ''}" +
				"</div>" +
				"</div>"
			return r.replace(/(\t|\n)/g, '')

		samplePart = do =>
			sample = json(@sample(t), 4)
			"<div class='sample'>\n" +
			"<span class='meta-field'>sample:</span>" +
			(if /\n/.test sample then "<pre>#{sample}</pre>" else "<span>#{sample}</span>") +
			"</div>"

		checkPart = if not check? then '' else
			"<div class='check'>" +
			"<span class='meta-field'>constraint:</span>" +
			(if /\n/.test check then "<pre>#{check}</pre>" else "<span>#{check}</span>") +
			"</div>"

		return "<div class='typespec'>" +
			namePart + descriptionPart + specPart + samplePart + checkPart
			"</div>"

module.exports = TypeSpec

