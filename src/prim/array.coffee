require 'coffee-mate/global'
{instance} = require '../typeclass'
{match, constraints, show, samples, sample, htmlInline, htmlBlock} = require '../typespec'

instance('TypeSpec')(Array).where
	match: ([spec]) -> (v) ->
		v? and v instanceof Array and (all(match spec) v)
	constraints: ([spec]) -> (v) -> cons(
		{
			label: -> "Array Expected, But Got #{v}"
			flag: -> v? and v instanceof Array
		}
	)(
		map(([i, x]) ->
			{
				label: -> "Element #{i} Expected to be #{show spec}" #, But Got #{json v}"
				sub: -> constraints(spec)(x)
			}
		) enumerate(v ? [])
	)
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

