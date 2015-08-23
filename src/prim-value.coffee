require 'coffee-mate/global'
{instance} = require './typeclass'

#`function Value(ls){
#	return {
#		constructor: Value,
#		value: ls
#	}
#}`

class Value
	constructor: (v) ->
		assert -> v?
		return {
			constructor: Value
			value: v
		}

instance('TypeSpec')(Value).where
	match: ({value}) -> (v) ->
		v is value
	show: ({value}) ->
		"Value #{json value}"
	samples: ({value}) ->
		repeat value
	htmlInline: ({value}) ->
		"<span class='type-maker unwrapped'>Value #{json value}</span>"

module.exports = {Value}
