require 'coffee-mate/global'
{typeclass} = require './typeclass'
{Any} = require './prim/any'

TypeSpec = typeclass('TypeSpec').where
	match: null
	shape: (t) -> Any
	constraints: null
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

constraints = TypeSpec.constraints
unmatchMessages = (spec) -> (v) ->
	r = []
	rec = (ls) ->
		rst = true
		foreach ls, ({label, flag, sub}) ->
			if flag?
				if flag() is false
					r.push label()
					rst = false
					foreach.break
			else if sub?
				if rec(sub()) is false
					r.push label()
					rst = false
					foreach.break
		return rst
	rec(constraints(spec)(v))
	return r

module.exports = extend({unmatchMessages})(TypeSpec)

