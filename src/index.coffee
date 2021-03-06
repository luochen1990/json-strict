require './prim/object'
require './prim/array'
require './prim/constructor'
{Bool} = require './prim/bool'
{Any} = require './prim/any'
{Int} = require './prim/int'
{Nat} = require './prim/nat'
{Enum} = require './prim/enum'
{Value} = require './prim/value'
{Optional} = require './prim/optional'
{Promise} = require './prim/promise'
{Tree} = require './prim/tree'
{Map} = require './prim/map'
{TreeMap} = require './prim/treemap'
{Fn} = require './prim/fn'
{NamedType} = require './prim/namedtype'
{Strict} = require './prim/strict'
{Loose} = require './prim/loose'
{Select} = require './prim/select'
{Choose} = require './prim/choose'
{OneOf} = require './prim/oneof'
{match, unmatchMessages, show, sample, samples, showHtml, htmlInline, htmlBlock} = require './typespec'
{genRenderCode, showPage} = require './render'
{typeclass, instance} = require './typeclass'
{genDocuments} = require './gen-doc'

module.exports = {
	Number, String,
	Bool, Any, Int, Nat, Enum, Value,
	Optional, Promise, Tree,
	Map, TreeMap, Fn,
	NamedType, Strict, Loose, Select, Choose, OneOf,
	match, unmatchMessages, show, sample, samples, showHtml, genRenderCode, showPage,
	typeclass, instance,
	genDocuments
}

if module.parent is null
	require 'coffee-mate/global'
	UserName = Optional String
	UserInfo = {
		name: UserName
		position: String
		age: Number
	}
	assert -> match(UserName)('luo') is true
	assert -> match(UserName)(1) is false
	log -> show UserName
	#log -> show UserInfo

	TableName = NamedType
		name: 'TableName'
		spec: String
		samples: ['table1', 'table2']
	FieldName = NamedType
		name: 'FieldName'
		spec: String
		samples: ['product_id', 'sale', 'amount']
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
	log -> unmatchMessages(WideTable) [
		{
			tableName: 'a'
			join: {
			}
		}
	]
	#log -> list(10) samples Any
	#log -> json list take(20) samples Any
	#log -> json sample Any
	#log -> sample Function
	#log -> json list take(20) samples [Any]
	#log -> json list take(20) samples Optional String
	#log -> json list take(20) samples Map(TableName, Number)
	#log -> json list take(20) samples NamedType spec: Strict {x: Number, y: String}
	#log -> json sample Enum ['a', 'b']
	#log -> json list take(20) samples [{tableName: TableName, join: {op: Number}}]
	#log -> json sample WideTable
	#log -> json list(10) samples Select {a: Number, b: String}

