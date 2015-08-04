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
{match, show, sample, samples, showHtml, htmlInline, htmlNode} = require './typespec'

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
	assert -> match(UserName)('luo') is true
	assert -> match(UserName)(1) is false
	log -> show UserName
	#log -> show UserInfo

	TableName = Data
		name: 'TableName'
		spec: String
		samples: ['table1', 'table2']
	FieldName = String
	Comparator = Enum ['=', '<', '<=', '>=', '>']
	Expr = Data
		name: "Expr"
		spec: Maybe
			left: String
			op: String
			right: String

	WideTable = [{
		tableName: TableName
		join: {
			leftTableName: TableName
			left: FieldName
			#op: Comparator
			right: FieldName
			test: Maybe {
				x: Number
				y: Number
			}
			expr: Expr
		}
	}]

	log -> json (sample WideTable), 4

	init = ->
		$('ul').each (i, elm) ->
			$(elm).closest('li').addClass('unfolded').removeClass('folded')
		$('.type-name').each (i, elm) ->
			$(elm).closest('li').addClass('folded').removeClass('unfolded')
			$(elm).click ->
				$(elm).closest('li').toggleClass('folded').toggleClass('unfolded')
		$('li').each (i, elm) ->
			$(elm).children('.unfold').children('.field-name').click ->
				$(elm).addClass('folded').removeClass('unfolded')
			$(elm).children('.fold').children('.field-name').click ->
				$(elm).addClass('unfolded').removeClass('folded')

	showPage = (t) -> """
		<style>
		.typespec {
			//white-space: pre;
			font-family: monospace;
		}
		.typespec li.unfolded>.fold, .typespec li.folded>.unfold {
			display: none
		}
		.typespec ul {
			list-style-type: none;
			padding: 0px;
			margin: 0px 0px 0px 2em;
		}
		.typespec .field-name {
			font-weight: bold;
			color: #87BFB8
		}
		.typespec .fold>.field-name, .typespec .unfold>.field-name {
			cursor: help
		}
		.typespec .type-name {
			color: blue;
			cursor: help
		}
		.typespec .type-maker {
			color: #223497
		}
		.typespec .spliter {
			display: inline-block;
			color: gray;
		}
		.typespec .type-name~.spliter {
			padding: 0 0.5em
		}
		.typespec .sample pre {
			margin: 0;
			color: green
		}
		</style>
		""" + (showHtml t) + """
		<script src="http://libs.baidu.com/jquery/1.9.0/jquery.js"></script>
		<script>
		""" + "(#{init.toString()})()" + """
		</script>
		"""

	fs = require 'fs'
	fs.writeFileSync('test.html', showPage WideTable)

	#htmlNode = (t) ->
	#	switch t.constructor
	#		when Data
	#			if t.name?
	#			head: t.name
	#		else
	#			...

	#html =
	#	div.typeDefinition
	#		div.headLine
	#			span.typeName 'WideTable'
	#			span.operator '='
	#			span.blockHead '[{'
	#		ul.bodyBlock
	#			li
	#				div.fold
	#					span.fieldName 'tableName'
	#					span.operator ':'
	#					span.typeName 'TableName'
	#			li
	#				div.unfold
	#					div.headLine
	#						span.fieldName 'join'
	#						span.operator ':'
	#						span.blockHead '{'
	#					ul.bodyBlock
	#						li
	#					div.tailLine
	#						span.blockTail '}'
	#		div.tailLine
	#			span.blockTail '}]'

	#htmlDescription =
	#	typeDefinition:
	#		fold:
	#		unfold:
	#			headLine:
	#				typeName: span 'WideTable'
	#				operator: span '='
	#				blockHead: span '['
	#			bodyBlock: ul (li) ->
	#				li
	#					fold:
	#						fieldName: span 'tableName'
	#						operator: ':'
	#						typeName: 'TableName'
	#				li
	#					unfold:
	#						headLine:
	#							fieldName: span 'join'
	#							operator: span ':'
	#							blockHead: span '{'
	#						bodyBlock: ul (li) ->
	#						tailLine:
	#							blockTail: span '}'

	#node:
	#	title:
	#	type:
	#		operator:
	#		beginRacket:
	#		endRacket:
	#	children:

	#log -> list(10) samples Any
	#log -> json list take(20) samples Any
	#log -> json sample Any
	#log -> sample Function
	#log -> json list take(20) samples [Any]
	#log -> json list take(20) samples Maybe String
	#log -> json list take(20) samples Map(TableName, Number)
	#log -> json list take(20) samples Data spec: Strict {x: Number, y: String}
	#log -> json sample Enum ['a', 'b']
	#log -> json list take(20) samples [{tableName: TableName, join: {op: Number}}]
	#log -> json sample WideTable
	#log -> json list(10) samples Either {a: Number, b: String}

