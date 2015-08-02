require './prim-object'
require './prim-array'
require './prim-constructor'
{Bool} = require './prim-bool'
{Any} = require './prim-any'
{Enum} = require './prim-enum'
{Maybe} = require './prim-maybe'
{Either} = require './prim-either'
{Dict} = require './prim-dict'
{Map} = require './prim-map'
{Strict} = require './prim-strict'
{Data} = require './prim-data'
{match, show, sample, samples} = require './typespec'

module.exports = {
	Number, String,
	Bool, Any, Enum, Maybe, Either, Dict, Strict, Data,
	match, show,
}

if module.parent is null
	require 'coffee-mate/global'
	UserName = Maybe String
	UserInfo = {
		name: UserName
		position: String
		age: Number
	}
	log -> match(UserName) 'luo'
	log -> match(UserName) 1
	log -> show UserName
	log -> show UserInfo

	TableName = String
	FieldName = String
	Comparator = Enum ['=', '<', '<=', '>=', '>']
	WideTable = [{
		tableName: TableName
		join: {
			leftTableName: TableName
			left: FieldName
			op: Comparator
			right: FieldName
		}
	}]
	log -> show WideTable

	log -> list(10) samples Any
	log -> json list take(20) samples Any
	log -> json sample Any
	#log -> json list take(20) samples [Any]
	#log -> json list take(20) samples Maybe String
	#log -> json list take(20) samples Map(TableName, Number)
	#log -> json list take(20) samples Data spec: Strict {x: Number, y: String}
	log -> json sample Enum ['a', 'b']
	log -> json list take(20) samples [{tableName: TableName, join: {op: Number}}]
	log -> json sample WideTable
	log -> json list(10) samples Either {a: Number, b: String}

