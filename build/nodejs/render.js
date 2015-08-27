(function() {
  var Any, Bool, Choose, Comparator, ConditionExpr, Context, DimensionFilter, DimensionName, Enum, ExclusionCondition, FieldName, Fn, FooSpec, InclusionCondition, Int, Loose, Map, Measure, MeasureName, MemberName, NamedType, Nat, Number, Optional, Promise, Select, SortCondition, Strict, String, TableName, Tree, TreeMap, Value, ValueExpr, WideTable, bind, entries, fs, genRenderCode, htmlBlock, htmlInline, init, match, ref, ref1, sample, samples, show, showHtml, showPage, style;

  ref = require('./typespec'), match = ref.match, show = ref.show, sample = ref.sample, samples = ref.samples, showHtml = ref.showHtml, htmlInline = ref.htmlInline, htmlBlock = ref.htmlBlock;

  style = ".typespec {\n	font-family: monospace;\n	font-size: 16px;\n	border-width: 4px;\n	border-color: rgba(165, 230, 229, 0.24);\n	border-style: ridge;\n}\n.typespec>div, .typespec>pre {\n	margin: 0.6em\n}\n.typespec .unfolded>.fold, .typespec .folded>.unfold {\n	display: none\n}\n.typespec ul {\n	list-style-type: none;\n	padding: 0px;\n	margin: 0px 0px 0px 2em;\n}\n.typespec .meta-field {\n	color: gray;\n}\n.typespec .field-name {\n	font-weight: bold;\n	color: #87BFB8\n}\n.typespec .type-name {\n	color: blue;\n}\n.typespec .spec .type-name {\n	cursor: pointer\n}\n.typespec .type-maker {\n	color: #223497\n}\n.typespec .type-maker.unwrapped .unwrapped:before {\n	content: '('\n}\n.typespec .type-maker.unwrapped .unwrapped:after {\n	content: ')'\n}\n.typespec .spliter {\n	color: gray;\n	padding: 0 0.5em\n}\n.typespec .sample pre {\n	margin: 0;\n	color: green;\n	max-height: 20em;\n	overflow: auto;\n}\n.typespec .spec {\n	cursor: default\n}\n.typespec .spec li:hover {\n	transition: 1s;\n	background-color: rgba(140, 150, 255, 0.12)\n}\n.typespec .spec .type-name:hover, .typespec .spec .folded-detail:hover, .typespec .fold>.field-name:hover, .typespec .unfold>.field-name:hover, .typespec .fold>.meta-field:hover, .typespec .unfold>.meta-field:hover {\n	opacity: 0.6\n}";

  bind = function($) {
    return function(rootSelection) {
      rootSelection.find('.unfold').each(function(i, elm) {
        return $(elm).closest('li,.spec').addClass('unfolded').removeClass('folded');
      });
      rootSelection.find('.type-name, .choose').each(function(i, elm) {
        return $(elm).closest('li').addClass('folded').removeClass('unfolded');
      });
      return rootSelection.find('.type-name, .folded-detail, .fold>.field-name, .unfold>.field-name, .fold>.meta-field, .unfold>.meta-field').each(function(i, elm) {
        var e;
        if ((e = $(elm).closest('li,.spec')).length > 0) {
          return $(elm).css({
            cursor: 'pointer'
          }).click(function() {
            return e.toggleClass('folded').toggleClass('unfolded');
          });
        }
      });
    };
  };

  showPage = function(t) {
    return "<meta http-equiv='Content-Type' content='text/html; charset=utf-8' />\n<style>" + style + "</style>\n" + (showHtml(t)) + "\n<script src='http://libs.baidu.com/jquery/1.9.0/jquery.js'></script>\n<script>(" + (bind.toString()) + ")(jQuery)($('.typespec'))</script>";
  };

  init = function($) {
    return function(bind, specs, style) {
      $('head').append("<style>" + style + "</style>");
      $('.typespec-hook').each(function(i, elm) {
        return $(elm).append(specs[$(elm).attr('it')]);
      });
      return bind($('.typespec'));
    };
  };

  genRenderCode = function(entries) {
    var specs;
    specs = json(dict(list(map(function(arg) {
      var k, v;
      k = arg[0], v = arg[1];
      return [k, showHtml(v)];
    })(enumerate(entries)))));
    return "(" + (init.toString()) + ")(jQuery)((" + bind + ")(jQuery), " + specs + ", " + (json(style)) + ")";
  };

  module.exports = {
    showPage: showPage,
    genRenderCode: genRenderCode
  };

  if (module.parent === null) {
    require('coffee-mate/global');
    ref1 = require('./index'), Number = ref1.Number, String = ref1.String, Bool = ref1.Bool, Any = ref1.Any, Int = ref1.Int, Nat = ref1.Nat, Enum = ref1.Enum, Value = ref1.Value, Optional = ref1.Optional, Promise = ref1.Promise, Tree = ref1.Tree, Map = ref1.Map, TreeMap = ref1.TreeMap, Fn = ref1.Fn, NamedType = ref1.NamedType, Strict = ref1.Strict, Loose = ref1.Loose, Select = ref1.Select, Choose = ref1.Choose, match = ref1.match, show = ref1.show, sample = ref1.sample, samples = ref1.samples, showHtml = ref1.showHtml, genRenderCode = ref1.genRenderCode, showPage = ref1.showPage;
    TableName = NamedType({
      name: 'TableName',
      spec: String,
      samples: ['table1', 'table2']
    });
    FieldName = NamedType({
      name: 'FieldName',
      spec: String,
      samples: ['product_id', 'sale', 'amount']
    });
    Comparator = Enum(['=', '<', '<=', '>=', '>']);
    WideTable = [
      {
        tableName: TableName,
        join: {
          leftTableName: TableName,
          left: FieldName,
          op: Comparator,
          right: FieldName
        }
      }
    ];
    DimensionName = NamedType({
      name: 'DimensionName',
      spec: String,
      samples: ['date', 'product_type', 'city']
    });
    MeasureName = NamedType({
      name: 'MeasureName',
      spec: String,
      samples: ['sale', 'profit', 'amount']
    });
    Measure = NamedType({
      name: 'Measure',
      spec: Strict({
        name: MeasureName,
        aggregator: Enum(['sum', 'avg', 'max', 'min'])
      })
    });
    MemberName = NamedType({
      name: 'MemberName',
      spec: String,
      samples: ['2013', '2014', '2015']
    });
    ValueExpr = NamedType({
      name: 'ValueExpr',
      spec: String,
      samples: ['sum(sale)']
    });
    ConditionExpr = NamedType({
      name: 'ConditionExpr',
      spec: String,
      samples: ['sum(sale) > 100']
    });
    DimensionFilter = NamedType({
      name: 'DimensionFilter',
      spec: Strict({
        select: [MemberName],
        match: Select({
          contains: String,
          startWith: String,
          endWith: String
        }),
        condition: Select({
          limit: Strict({
            measure: Measure,
            comparator: Comparator,
            value: Number
          }),
          expr: ConditionExpr
        }),
        top: Strict({
          count: Number,
          by: Select({
            measure: Measure,
            expr: ValueExpr
          })
        })
      })
    });
    InclusionCondition = NamedType({
      name: 'InclusionCondition',
      spec: Strict({
        via: [DimensionName],
        positions: [[MemberName]]
      })
    });
    ExclusionCondition = NamedType({
      name: 'ExclusionCondition',
      spec: Strict({
        via: [DimensionName],
        positions: [[MemberName]]
      })
    });
    SortCondition = NamedType({
      name: 'SortCondition',
      spec: Strict({
        asc: Bool,
        by: Select({
          measure: Measure,
          expr: ValueExpr
        }),
        where: Optional(ConditionExpr)
      })
    });
    Context = {
      filter: Strict({
        dimensions: Map(DimensionName)(DimensionFilter),
        measures: [
          Strict({
            measure: Measure,
            limit: {
              minBound: Optional(Number),
              maxBound: Optional(Number)
            }
          })
        ],
        inclusions: [InclusionCondition],
        exclusions: [ExclusionCondition]
      }),
      sort: Map(DimensionName)(SortCondition)
    };
    log(function() {
      return json(sample(WideTable), 4);
    });
    log(function() {
      return show(Context);
    });
    FooSpec = NamedType({
      name: 'FooSpec',
      spec: Fn(Number)(Fn({
        x: Number,
        y: Number
      })(Promise({
        x: String,
        y: Choose([Nat, String, Value('unavailable')])
      }))),
      desc: "hello",
      check: function(x) {
        return x > 1;
      }
    });
    fs = require('fs');
    fs.writeFileSync('test.html', showPage(WideTable));
    entries = {
      a: FooSpec,
      b: WideTable,
      c: Context,
      d: FieldName,
      e: Select({
        x: Number,
        y: String
      }),
      f: Fn(Tree(Int))(Loose({
        x: Number,
        y: Number
      }))
    };
    fs.writeFileSync('test2.js', genRenderCode(entries));
  }

}).call(this);

//# sourceMappingURL=render.js.map