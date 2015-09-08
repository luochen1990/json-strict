{htmlInline, htmlBlock} = require './typespec'
{typeclass} = require './typeclass'

expandBlockHead = (f) -> (spec) ->
	block = htmlBlock spec
	if not block?
		null
	else
		head: f(block.head)
		body: block.body
		tail: block.tail

genBlockBody = (bodyClass, keyClass) -> (specdict) ->
	lis = map(([k, v]) ->
		block = htmlBlock v
		return """
		<li>
		<div class='#{if block? then 'fold' else 'inline'}'>
			<span class='#{keyClass}'>#{k}</span>: #{htmlInline v}
		</div>
		#{if block? then (
			"""
			<div class='unfold'>
				<span class='#{keyClass}'>#{k}</span>: #{block.head}
				#{block.body ? ''}
				#{block.tail ? ''}
			</div>
			"""
		) else ''}
		</li>
		"""
	) enumerate(specdict)
	return "<ul class='#{bodyClass}'>" + (list lis).join('\n') + "</ul>"

isTypeSpec = (spec) ->
	spec? and typeclass('TypeSpec').hasInstance(spec.constructor)

isTypeSpecDict = (specdict) ->
	all(([k, v]) -> isTypeSpec(v)) enumerate(specdict)

module.exports = {expandBlockHead, genBlockBody, isTypeSpec, isTypeSpecDict}

