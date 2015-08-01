require 'coffee-mate/global'
{instance} = require './typeclass'
{match, show} = require './typespec'

Dict = (spec) ->
	constructor: Dict
	spec: spec

instance('TypeSpec')(Dict).where
	match: ({spec}) -> (v) ->
		v.constructor is Object and all(match spec) map(seek v) Object.keys(v)
	show: ({spec}) ->
		"Dict #{show spec}"

module.exports = {Dict}
