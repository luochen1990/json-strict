require 'coffee-mate/global'
{instance} = require './typeclass'

instance('TypeSpec')(Function).where
	match: (spec) -> (v) ->
		v.constructor is spec
	show: (spec) ->
		spec.name or 'UnnamedType'

