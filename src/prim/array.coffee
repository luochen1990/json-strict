require 'coffee-mate/global'
{instance} = require '../typeclass'
{match, show, samples, sample, htmlInline, htmlBlock} = require '../typespec'

instance('TypeSpec')(Array).where
	match: ([spec]) -> (v) ->
		v? and v.constructor is Array and (all(match spec) v)
	show: ([spec]) ->
		"[#{show spec}]"
	samples: ([spec]) ->
		concat repeat reverse map((n) -> list take(n) samples spec) range(3)
	sample: ([spec]) ->
		[sample spec]
	htmlInline: ([spec]) ->
		"<span class='type-maker'>[#{htmlInline spec}]</span>"
	htmlBlock: ([spec]) ->
		if not (node = htmlBlock spec)?
			null
		else
			head: "<span class='type-maker'>[#{node.head}</span>"
			body: node.body
			tail: "<span class='type-maker'>#{node.tail ? ''}]</span>"

