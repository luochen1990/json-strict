require 'coffee-mate/global'
{instance} = require './typeclass'
{match, show, samples, sample, htmlInline, htmlNode} = require './typespec'

class Data
	constructor: ({name, spec, check, samples, discription}) ->
		if not name?
			throw ReferenceError 'name must be specified for a Data declaration'
		if not spec?
			throw ReferenceError 'spec must be specified for a Data declaration'
		if samples? and not all(match(spec))(take(100) samples)
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
			discription
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

module.exports = {Data}
