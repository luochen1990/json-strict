require 'coffee-mate/global'
{instance} = require './typeclass'
{match, show} = require './typespec'

Maybe = (spec) ->
	constructor: Maybe
	spec: spec

instance('TypeSpec')(Maybe).where
	match: ({spec}) -> (v) ->
		not v? or match(spec) v
	show: ({spec}) ->
		"Maybe #{show spec}"

module.exports = {Maybe}
