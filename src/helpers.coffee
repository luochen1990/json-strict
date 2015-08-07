{htmlInline, htmlBlock} = require './typespec'

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

module.exports = {expandBlockHead, genBlockBody}

