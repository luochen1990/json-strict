require 'coffee-mate/global'
{instance} = require './typeclass'
{match, show, samples, sample, htmlInline, htmlNode} = require './typespec'

instance('TypeSpec')(Array).where
	match: ([spec]) -> (v) ->
		v.constructor is Array and all(match spec) v
	show: ([spec]) ->
		"[#{show spec}]"
	samples: ([spec]) ->
		concat repeat reverse map((n) -> list take(n) samples spec) range(4)
	sample: ([spec]) ->
		[sample spec]
	htmlInline: ([spec]) ->
		"<span class='type-maker'>[#{htmlInline spec}]</span>"
	htmlNode: ([spec]) ->
		if not (node = htmlNode spec)?
			null
		else
			head: "<span class='type-maker'>[#{node.head}</span>"
			body: node.body
			tail: "<span class='type-maker'>#{node.tail ? ''}]</span>"

