require 'coffee-mate/global'
{typeclass} = require './typeclass'

{match, show} = typeclass('TypeSpec') ['match', 'show']

module.exports = {match, show}

