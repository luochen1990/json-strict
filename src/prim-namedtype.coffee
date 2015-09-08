require 'coffee-mate/global'
{typeclass, instance} = require './typeclass'
{match, show, samples, sample, htmlInline, htmlBlock} = require './typespec'
{expandBlockHead} = require './helpers'

class NamedType
	constructor: ({name, spec, desc, check, samples}) ->
		unless name? and spec?
			throw Error "Bad NamedType Definition: name & spec Must Be Specified"
		unless spec? and typeclass('TypeSpec').hasInstance(spec.constructor)
			throw Error "Bad NamedType Definition: TypeSpec as spec Expected, But Got #{spec}\n\tname: #{name}"
		unless not samples? or all(match(spec))(take(100) samples)
			throw Error "Bad NamedType Definition: samples Should Match spec\n\tname: #{name}\n\tspec: #{spec}"

		return {
			constructor: NamedType
			name
			spec
			desc
			check
			samples
		}

instance('TypeSpec')(NamedType).where
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
		{name, desc, spec, check} = t

		namePart = if not name? then '' else """
			<div class='name'>
			<span class='meta-field'>name</span>: <span class='type-name'>#{name}</span>
			</div>
			"""

		descriptionPart = if not desc? then '' else do ->
			s = desc
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

module.exports = {NamedType}
