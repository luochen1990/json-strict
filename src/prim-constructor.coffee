require 'coffee-mate/global'
{instance} = require './typeclass'
{match, show, samples, sample} = require './typespec'

instance('TypeSpec')(Function).where
	match: (spec) -> (v) ->
		v? and v.constructor is spec
	show: (spec) ->
		spec.name or 'UnnamedType'
	samples: (spec) ->
		switch spec
			when Boolean
				concat repeat [true, false]
			when Number
				concat repeat [3.14, 9, 42]
			when String
				concat repeat ['abc', 'hello']
			else
				repeat (new spec)
	htmlInline: (spec) ->
		"<span class='type-maker'>#{show spec}</span>"

