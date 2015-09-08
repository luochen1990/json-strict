require 'coffee-mate/global'
{instance} = require '../typeclass'
{match, show, samples, sample, htmlInline, htmlBlock} = require '../typespec'
{genBlockBody, isTypeSpec} = require '../helpers'

class Choose
	constructor: (specs) ->
		unless specs? and specs.constructor is Array
			throw Error "Bad Choose Type Definition: Array Expected, But Got #{specs}"
		unless all(isTypeSpec)(specs)
			throw Error "Bad Choose Type Definition: Array of TypeSpec Expected, But Got #{specs}"

		return {
			constructor: Choose
			specs: specs
		}

instance('TypeSpec')(Choose).where
	match: ({specs}) -> (v) ->
		v? and any((spec) -> match(spec) v)(specs)
	show: ({specs}) ->
		(list map(show) specs).join(' | ')
	samples: ({specs}) ->
		concat repeat map(sample)(specs)
	htmlInline: ({specs}) ->
		"<span class='type-maker unwrapped'>#{(list map(htmlInline) specs).join(' | ')}</span>"
	htmlBlock: ({specs}) ->
		#log -> (list zip(repeat('-'), specs))
		head: "<span class='type-maker'>Choose [</span>"
		body: genBlockBody('choose', 'meta-field')(dict list zip(naturals, specs))
		tail: "<span class='type-maker'>]</span>"

module.exports = {Choose}
