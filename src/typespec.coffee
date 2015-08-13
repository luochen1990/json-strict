require 'coffee-mate/global'
{typeclass} = require './typeclass'
#{Data} = require './index'

TypeSpec = typeclass('TypeSpec').where
	match: null
	withSpec: (t) -> (v) ->
		if not @match(t)(v)
			throw TypeError {expected: @show(t), got: v}
		else
			return v
	show: (t) ->
		t.name or 'UnnamedType'
	samples: null
	sample: (t) -> head @samples(t)
	htmlInline: (t) ->
		"<span class='type-maker'>#{@show t}</span>"
	htmlBlock: (t) -> null
	showHtml: (t) ->
		specPart = do =>
			block = @htmlBlock t
			return """
			<div class='spec'>
			<div class='#{if block? then 'fold' else 'inline'}'><span class='meta-field'>spec</span>: #{@htmlInline t}</div>
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

		samplePart = do =>
			s = json(@sample(t), 4)
			return """
			<div class='sample'>
			<span class='meta-field'>sample</span>: #{
				if /\n/.test s then "<pre class='code'>#{s}</pre>" else "<span class='code'>#{s}</span>"
			}
			</div>
			"""

		return "<div class='typespec'>#{specPart + samplePart}</div>"

module.exports = TypeSpec

