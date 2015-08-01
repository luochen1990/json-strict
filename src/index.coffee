require './prim-constructor'
require './prim-object'
require './prim-array'
{Bool} = require './prim-bool'
{Any} = require './prim-any'
{Enum} = require './prim-enum'
{Maybe} = require './prim-maybe'
{Either} = require './prim-either'
{Dict} = require './prim-dict'
{Strict} = require './prim-strict'
{Data} = require './prim-data'
{match, show} = require './typespec'

module.exports = {
	Bool, Any, Enum, Maybe, Either, Dict, Strict, Data
	match, show
}

if module.parent is null
	require 'coffee-mate/global'
	UserName = Maybe String
	log -> match(UserName) 'luo'
	log -> match(UserName) 1
