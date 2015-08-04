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

style = """
	.typespec {
		font-family: monospace;
		font-size: 16px;
		border-width: 4px;
		border-color: rgba(165, 230, 229, 0.24);
		border-style: ridge;
	}
	.typespec>div, .typespec>pre {
		margin: 0.6em
	}
	.typespec .unfolded>.fold, .typespec .folded>.unfold {
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
		padding: 0 0.5em 0 0
	}
	.typespec .type-name~.spliter {
		padding: 0 0.5em
	}
	.typespec .sample pre {
		margin: 0;
		color: green
	}
"""

bind = ($) -> (rootSelection) ->
	#console.info rootSelection.find('ul')
	rootSelection.find('ul').each (i, elm) ->
		$(elm).closest('li,.spec').addClass('unfolded').removeClass('folded')
	rootSelection.find('.type-name').each (i, elm) ->
		$(elm).closest('li,.spec').addClass('folded').removeClass('unfolded')
		$(elm).click ->
			$(elm).closest('li,.spec').toggleClass('folded').toggleClass('unfolded')
	rootSelection.find('li').each (i, elm) ->
		$(elm).children('.unfold').children('.field-name').click ->
			$(elm).addClass('folded').removeClass('unfolded')
		$(elm).children('.fold').children('.field-name').click ->
			$(elm).addClass('unfolded').removeClass('folded')

showPage = (t) -> "<style>#{style}</style>" + (showHtml t) +
	"<script src='http://libs.baidu.com/jquery/1.9.0/jquery.js'></script>" +
	"<script>" + "(#{bind.toString()})(jQuery)($('.typespec'))" + "</script>"

init = ($) -> (bind, specs, style) ->
	$('head').append("<style>#{style}</style>")
	$('.typespec-hook').each (i, elm) ->
		$(elm).append(specs[$(elm).attr('it')])
	bind($('.typespec'))

renderCode = (entries) ->
	specs = json dict list map(([k, v]) -> [k, (showHtml v)]) enumerate(entries)
	"(#{init.toString()})(jQuery)((#{bind})(jQuery), #{specs}, #{json style})"

module.exports = {
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

	fs = require 'fs'
	fs.writeFileSync('test.html', showPage WideTable)

	entries = {
		a: TableName
		b: WideTable
		c: Expr
	}

	fs.writeFileSync 'test2.html', """
		<div class='typespec-hook' it='a'></div>
		haha
		<div class='typespec-hook' it='b'></div>
		haha
		<div class='typespec-hook' it='c'></div>
		<script src='http://libs.baidu.com/jquery/1.9.0/jquery.js'></script>
		<script src='./test2.js'></script>
	"""
	fs.writeFileSync('test2.js', renderCode entries)

