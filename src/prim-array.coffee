require 'coffee-mate/global'
{instance} = require './typeclass'

instance('TypeSpec')(Array).where
	match: ([spec]) -> (v) ->
		v.constructor is Array and all(match spec) v
	show: ([spec]) ->
		"[#{show spec}]"

