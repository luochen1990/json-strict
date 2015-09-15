{fromList} = require('coffee-mate')
{readDir} = require './utils'

module.exports = fromList readDir(__dirname, './prim/').map (s) ->
	[_, fname, suffix] = s.match /(.+)\.([^.]+)/
	[fname, require('./prim/' + fname)]

if module.parent is null
	console.log readDir(__dirname, './prim/')
	console.log module.exports

