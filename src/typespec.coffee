require 'coffee-mate/global'
{typeclass} = require './typeclass'

{match, show} = typeclass('TypeSpec').where
	match: null
	show: null
	samples: null
	sample: (t) -> head @samples(t)

module.exports = {match, show}

