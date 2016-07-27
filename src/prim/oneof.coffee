require 'coffee-mate/global'
{instance} = require '../typeclass'
{shape, match, constraints, show, samples, sample, htmlInline, htmlBlock} = require '../typespec'
{genBlockBody, isTypeSpec} = require '../helpers'
{Choose} = require './choose'

class OneOf
	constructor: (specs) ->
		unless specs? and specs.constructor is Array
			throw Error "Bad OneOf Type Definition: Array Expected, But Got #{specs}"
		unless all(isTypeSpec)(specs)
			throw Error "Bad OneOf Type Definition: Array of TypeSpec Expected, But Got #{specs}"

		#log -> specs.map(show)
		return {
			constructor: OneOf
			specs: specs
		}

instance('TypeSpec')(OneOf).where
	shape: ({specs}) -> Choose specs.map(shape)
	match: ({specs}) ->
		shaped = zip(map(shape)(specs), specs)
		(v) ->
			matchedShapes = filter(([sh, _]) -> match(sh)(v)) shaped
			#log -> specs.map(show)
			#log -> list(matchedShapes).map(show)
			return length(take(2) matchedShapes) == 1 and match(head(matchedShapes)[1])(v)
	constraints: ({specs}) ->
		shaped = zip(map(shape)(specs), specs)
		(v) ->
			matchedShapes = filter(([sh, _]) -> match(sh)(v)) shaped
			matchedCount = length(take(2) matchedShapes)
			return [
				{
					label: -> "Shape #{list(map(show) map(pluck 0) shaped).join(' | ')} Expected, But Got #{v}"
					flag: -> matchedCount > 0
				}
				{
					label: -> "Ambiguous Shape #{list(map(show) map(pluck 0) matchedShapes).join(' | ')} Matched, Got #{json v}"
					flag: -> matchedCount < 2
				}
				{
					label: -> "Shape #{show(head(matchedShapes)[0])}"
					sub: -> constraints(head(matchedShapes)[1])(v)
				}
			]
	show: ({specs}) ->
		"(#{(list map(show) specs).join(' | ')})"
	samples: ({specs}) ->
		concat repeat map(sample)(specs)
	htmlInline: ({specs}) ->
		"<span class='type-maker unwrapped'>#{(list map(htmlInline) specs).join(' | ')}</span>"
	htmlBlock: ({specs}) ->
		#log -> (list zip(repeat('-'), specs))
		head: "<span class='type-maker'>OneOf [</span>"
		body: genBlockBody('OneOf', 'meta-field')(dict list zip(naturals, specs))
		tail: "<span class='type-maker'>]</span>"

module.exports = {OneOf}

