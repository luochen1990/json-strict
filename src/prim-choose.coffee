require 'coffee-mate/global'
{typeclass, instance} = require './typeclass'
{match, show, samples, sample, htmlInline, htmlBlock} = require './typespec'
{genBlockBody} = require './helpers'

class Choose
	constructor: (specs) ->
		assert -> specs? and specs.constructor is Array
		assert -> all((x) -> x? and typeclass('TypeSpec').hasInstance(x.constructor))(specs)
		return {
			constructor: Choose
			specs: specs
		}

instance('TypeSpec')(Choose).where
	match: ({specs}) -> (v) ->
		v? and all(match(spec) v)
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
