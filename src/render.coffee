{match, show, sample, samples, showHtml, htmlInline, htmlBlock} = require './typespec'

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
	.typespec .meta-field {
		color: gray;
	}
	.typespec .field-name {
		font-weight: bold;
		color: #87BFB8
	}
	.typespec .type-name {
		color: blue;
	}
	.typespec .spec .type-name {
		cursor: pointer
	}
	.typespec .type-maker {
		color: #223497
	}
	.typespec .type-maker.unwrapped .unwrapped:before {
		content: '('
	}
	.typespec .type-maker.unwrapped .unwrapped:after {
		content: ')'
	}
	.typespec .spliter {
		color: gray;
		padding: 0 0.5em
	}
	.typespec .sample pre {
		margin: 0;
		color: green;
		max-height: 20em;
		overflow: auto;
	}
	.typespec .spec {
		cursor: default
	}
	.typespec .spec li:hover {
		transition: 1s;
		background-color: rgba(140, 150, 255, 0.12)
	}
	.typespec .spec .type-name:hover, .typespec .spec .folded-detail:hover, .typespec .fold>.field-name:hover, .typespec .unfold>.field-name:hover, .typespec .fold>.meta-field:hover, .typespec .unfold>.meta-field:hover {
		opacity: 0.6
	}
"""

bind = ($) -> (rootSelection) ->
	#console.info rootSelection.find('ul')
	rootSelection.find('.unfold').each (i, elm) ->
		$(elm).closest('li,.spec').addClass('unfolded').removeClass('folded')
	rootSelection.find('.type-name, .choose').each (i, elm) ->
		$(elm).closest('li').addClass('folded').removeClass('unfolded')
	rootSelection.find('.type-name, .folded-detail, .fold>.field-name, .unfold>.field-name, .fold>.meta-field, .unfold>.meta-field').each (i, elm) ->
		if (e = $(elm).closest('li,.spec')).length > 0
			$(elm).css(cursor: 'pointer').click ->
				e.toggleClass('folded').toggleClass('unfolded')
	#rootSelection.find('li').each (i, elm) ->
	#	$(elm).children('.unfold').children('.field-name,.meta-field').click ->
	#		$(elm).addClass('folded').removeClass('unfolded')
	#	$(elm).children('.fold').children('.field-name,.meta-field').click ->
	#		$(elm).addClass('unfolded').removeClass('folded')

showPage = (t) ->
	"""
	<meta http-equiv='Content-Type' content='text/html; charset=utf-8' />
	<style>#{style}</style>
	#{showHtml t}
	<script src='http://libs.baidu.com/jquery/1.9.0/jquery.js'></script>
	<script>(#{bind.toString()})(jQuery)($('.typespec'))</script>
	"""

init = ($) -> (bind, specs, style) ->
	$('head').append("<style>#{style}</style>")
	$('.typespec-hook').each (i, elm) ->
		$(elm).append(specs[$(elm).attr('it')])
	bind($('.typespec'))

genRenderCode = (entries) ->
	specs = json dict list map(([k, v]) -> [k, (showHtml v)]) enumerate(entries)
	"(#{init.toString()})(jQuery)((#{bind})(jQuery), #{specs}, #{json style})"

module.exports = {
	showPage, genRenderCode
}

if module.parent is null
	require 'coffee-mate/global'
	{
		Number, String,
		Bool, Any, Int, Enum, Value,
		Maybe, Promise, Tree,
		Map, Fn,
		NamedType, Strict, Loose, Select, Choose,
		match, show, sample, samples, showHtml, genRenderCode, showPage,
	} = require './index'

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

	DimensionName = NamedType
		name: 'DimensionName'
		spec: String
		samples: ['date', 'product_type', 'city']
	MeasureName = NamedType
		name: 'MeasureName'
		spec: String
		samples: ['sale', 'profit', 'amount']
	Measure = NamedType
		name: 'Measure'
		spec: Strict {
			name: MeasureName
			aggregator: Enum ['sum', 'avg', 'max', 'min']
		}
	MemberName = NamedType
		name: 'MemberName'
		spec: String
		samples: ['2013', '2014', '2015']
	ValueExpr = NamedType
		name: 'ValueExpr'
		spec: String
		samples: ['sum(sale)']
	ConditionExpr = NamedType
		name: 'ConditionExpr'
		spec: String
		samples: ['sum(sale) > 100']

	DimensionFilter = NamedType
		name: 'DimensionFilter'
		spec: Strict {
			select: [MemberName]
			match: Select {
				contains: String
				startWith: String
				endWith: String
			}
			condition: Select {
				limit: Strict {
					measure: Measure
					comparator: Comparator
					value: Number
				}
				expr: ConditionExpr
			}
			top: Strict {
				count: Number
				by: Select {
					measure: Measure
					expr: ValueExpr
				}
			}
		}
	InclusionCondition = NamedType
		name: 'InclusionCondition'
		spec: Strict {
			via: [DimensionName]
			positions: [[MemberName]]
		}
	ExclusionCondition = NamedType
		name: 'ExclusionCondition'
		spec: Strict {
			via: [DimensionName]
			positions: [[MemberName]]
		}
	SortCondition = NamedType
		name: 'SortCondition'
		spec: Strict {
			asc: Bool
			by: Select {
				measure: Measure
				expr: ValueExpr
			}
			where: Maybe ConditionExpr
		}
	Context =
		filter: Strict
			dimensions: Map DimensionName, DimensionFilter
			measures: [Strict {
				measure: Measure
				limit:
					minBound: Maybe Number
					maxBound: Maybe Number
			}]
			inclusions: [InclusionCondition]
			exclusions: [ExclusionCondition]
		sort: Map DimensionName, SortCondition

	#contextSample =
	#	filter: {
	#		dimensions: {
	#			"product_name": {
	#				select: ['mp3', 'mp4']
	#				match: { # {contains: ..} or {startWith: ..} or {endWith: ..}
	#					contains: 'abc'
	#					startWith: 'abc'
	#					endWith: 'abc'
	#				}
	#				condition: {# {limit: ...} or {expr: '...'}
	#					limit: {
	#						measure: 'sale'
	#						aggregator: 'sum'
	#						if: {
	#							comparator: '>'
	#							value: 100
	#						}
	#					}
	#				}
	#				top: {
	#					count: 10
	#					by: {# {field: ...} or {formula: ...}
	#						field: {
	#							measure: 'sale'
	#							aggregator: 'sum'
	#						}
	#					}
	#				}
	#			}
	#		}
	#		measures: [{
	#			measure:
	#				name: 'sale'
	#				aggregator: 'sum'#aggregation type. e.g. 'sum', 'avg', 'item'
	#			limit:
	#				minBound: 10
	#				maxBound: 100
	#		}]
	#		inclusions: [
	#			{
	#				field: ['product type', 'product name']
	#				values: [
	#					['electric appliance', 'mp3']
	#					['electric appliance', 'mp4']
	#				]
	#			}
	#		]
	#		exclusions: [
	#			{
	#				field: ['product type', 'product name']
	#				values: [
	#					['electric appliance', 'mp3']
	#					['electric appliance', 'mp4']
	#				]
	#			}
	#		]
	#	}
	#	sort: {
	#		"product_name": {
	#			asc: true
	#			by: {# {field: ...} or {formula: ...}
	#				field: {
	#					measure: 'sale'
	#					aggregator: 'sum'
	#				}
	#			}
	#			where: ''
	#		}
	#	}

	log -> json (sample WideTable), 4
	log -> show Context

	FooSpec = NamedType
		name: 'FooSpec'
		spec: Fn(Number) Fn({x: Number, y: Number}) Promise {x: String, y: Choose [Int, String, Value 'unavailable']}
		desc: "hello"
		check: (x) -> x > 1

	fs = require 'fs'
	fs.writeFileSync('test.html', showPage WideTable)

	entries = {
		a: FooSpec
		b: WideTable
		c: Context
		d: FieldName
		e: Select {x: Number, y: String}
		f: Fn(Tree Int) (Loose {x: Number, y: Number})
	}

	fs.writeFileSync('test2.js', genRenderCode entries)

