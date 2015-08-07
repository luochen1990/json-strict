require 'coffee-mate/global'
{typeclass, instance} = require './typeclass'
{match, show, samples, sample, htmlInline, htmlBlock} = require './typespec'
{expandBlockHead} = require './helpers'

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
	htmlBlock: ({name, spec}) ->
		expandBlockHead((head) ->
			"<span><span class='type-name'>#{name}</span><span class='spliter'>spec:</span>#{head}</span>"
		)(spec) ? {
			head: "<span><span class='type-name'>#{name}</span><span class='spliter'>spec:</span>#{htmlInline spec}</span>"
		}
	showHtml: (t) ->
		{name, description, spec, check} = t

		namePart = if not name? then '' else """
			<div class='name'>
			<span class='meta-field'>name</span>: <span class='type-name'>#{name}</span>
			</div>
			"""

		descriptionPart = if not description? then '' else do ->
			s = description
			return """
			<div class='desc'>
			<span class='meta-field'>desc</span>: #{
				if /\n/.test s then "<pre class='text'>#{s}</pre>" else "<span class='text'>#{s}</span>"
			}
			</div>
			"""

		specPart = do ->
			block = htmlBlock spec
			return """
			<div class='spec'>
			<div class='#{if block? then 'fold' else 'inline'}'><span class='meta-field'>spec</span>: #{htmlInline spec}</div>
			#{if block? then (
				"""
				<div class='unfold'>
					<span class='meta-field'>spec</span>: #{block.head}
					#{block.body ? ''}
					#{block.tail ? ''}
				</div>
				"""
			) else ''}
			</div>
			""".replace(/(\t|\n)/g, '')

		samplePart = do ->
			s = json(sample(t), 4)
			return """
			<div class='sample'>
			<span class='meta-field'>sample</span>: #{
				if /\n/.test s then "<pre class='code'>#{s}</pre>" else "<span class='code'>#{s}</span>"
			}
			</div>
			"""

		checkPart = if not check? then '' else do ->
			s = check.toString()
			return """
			<div class='check'>
			<span class='meta-field'>constraint</span>: #{
				if /\n/.test s then "<pre class='code'>#{s}</pre>" else "<span class='code'>#{s}</span>"
			}
			</div>
			"""

		return "<div class='typespec'>#{ namePart + descriptionPart + specPart + samplePart + checkPart }</div>"

module.exports = {Data}
