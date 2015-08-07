require 'coffee-mate/global'
{typeclass, instance} = require './typeclass'
{match, show, samples, sample, htmlInline, htmlNode} = require './typespec'

class Data
	constructor: ({name, spec, check, samples, description}) ->
		if not name?
			throw ReferenceError 'name must be specified for a Data declaration'
		if not spec?
			throw ReferenceError 'spec must be specified for a Data declaration'
		assert -> typeclass('TypeSpec').hasInstance(spec.constructor)
		if samples? and not all(match(spec))(take(100) samples)
			log -> name
			log -> spec
			log -> samples
			log -> match(spec) samples[0]
			throw TypeError 'bad samples'

		return {
			constructor: Data
			spec
			check
			name
			samples
			description
		}

instance('TypeSpec')(Data).where
	match: ({spec, check}) -> (v) ->
		match(spec)(v) and (if check? then check(v) else true)
	show: ({name, spec}) ->
		name or (show spec)
	samples: ({spec, samples: ls}) ->
		if ls? then concat repeat ls else samples spec
	htmlInline: ({name, spec}) ->
		if name? then "<span class='type-name'>#{name}</span>" else htmlInline spec
	htmlNode: ({name, spec}) ->
		if not (node = htmlNode spec)?
			head: "<span><span class='type-name'>#{name}</span><span class='spliter'>spec:</span>#{htmlInline spec}</span>"
			body: null
			tail: null
		else
			head: "<span><span class='type-name'>#{name}</span><span class='spliter'>spec:</span>#{node.head}</span>"
			body: node.body
			tail: node.tail
	showHtml: (t) ->
		{name, description, spec, check} = t

		namePart = if not name? then '' else
			"<div class='name'>" +
			"<span class='meta-field'>name</span>: " +
			"<span class='type-name'>#{name}</span>" +
			"</div>"

		descriptionPart = if not description? then '' else
			"<div class='desc'>" +
			"<span class='meta-field'>desc</span>: " +
			(if /\n/.test description then "<pre>#{description}</pre>" else "<span>#{description}</span>") +
			"</div>"

		specPart = do ->
			block = htmlNode spec
			if not block?
				r = htmlInline spec
			else
				r = "<div class='spec'>" +
				"<div class='fold'><span class='meta-field'>spec</span>: #{htmlInline spec}</div>" +
				"<div class='unfold'>" +
				"<span class='meta-field'>spec</span>: #{block.head}" +
				"#{block.body ? ''}" +
				"#{block.tail ? ''}" +
				"</div>" +
				"</div>"
			return r.replace(/(\t|\n)/g, '')

		samplePart = do ->
			sample = json(sample(t), 4)
			"<div class='sample'>\n" +
			"<span class='meta-field'>sample</span>: " +
			(if /\n/.test sample then "<pre>#{sample}</pre>" else "<span>#{sample}</span>") +
			"</div>"

		checkPart = if not check? then '' else
			"<div class='check'>" +
			"<span class='meta-field'>constraint</span>: " +
			(if /\n/.test check then "<pre>#{check}</pre>" else "<span>#{check}</span>") +
			"</div>"

		return "<div class='typespec'>" +
			namePart + descriptionPart + specPart + samplePart + checkPart +
			"</div>"

module.exports = {Data}
