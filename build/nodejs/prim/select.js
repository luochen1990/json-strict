(function() {
  var Select, constraints, genBlockBody, htmlBlock, htmlInline, instance, isTypeSpecDict, match, ref, ref1, ref2, sample, samples, show, typeclass;

  require('coffee-mate/global');

  ref = require('../typeclass'), typeclass = ref.typeclass, instance = ref.instance;

  ref1 = require('../typespec'), match = ref1.match, constraints = ref1.constraints, show = ref1.show, samples = ref1.samples, sample = ref1.sample, htmlInline = ref1.htmlInline, htmlBlock = ref1.htmlBlock;

  ref2 = require('../helpers'), genBlockBody = ref2.genBlockBody, isTypeSpecDict = ref2.isTypeSpecDict;

  Select = (function() {
    function Select(specs) {
      if (!isTypeSpecDict(specs)) {
        throw Error("Bad Select Type Definition: TypeSpec as spec Expected");
      }
      if (!(Object.keys(specs).length >= 1)) {
        throw Error("Bad Select Type Definition: At Least One Selection Should Be Provided");
      }
      return {
        constructor: Select,
        specs: specs
      };
    }

    return Select;

  })();

  instance('TypeSpec')(Select).where({
    match: function(arg) {
      var specs;
      specs = arg.specs;
      return function(v) {
        var k, ks, spec;
        return (v != null) && (ks = Object.keys(v)).length === 1 && ((spec = specs[(k = ks[0])]) != null) && (match(spec)(v[k]));
      };
    },
    constraints: function(arg) {
      var specs;
      specs = arg.specs;
      return function(v) {
        return [
          {
            label: function() {
              return "Object Expected, But Got " + v;
            },
            flag: function() {
              return v != null;
            }
          }, {
            label: function() {
              return "Selection Between " + (Object.keys(specs).join(',')) + " Expected, But Got " + (Object.keys(v).join(',')) + " Via " + (json(v));
            },
            flag: function() {
              var k, ks, spec;
              return (ks = Object.keys(v)).length === 1 && ((spec = specs[(k = ks[0])]) != null);
            }
          }, {
            label: function() {
              var k;
              return "Selection Field " + (k = Object.keys(v)[0]) + " Expected to be " + (show(specs[k]));
            },
            sub: function() {
              var k;
              return constraints(specs[k = Object.keys(v)[0]])(v[k]);
            }
          }
        ];
      };
    },
    show: function(arg) {
      var specs;
      specs = arg.specs;
      return "T.Select({" + ((list(map(function(arg1) {
        var k, spec;
        k = arg1[0], spec = arg1[1];
        return k + ": " + (show(spec));
      })(enumerate(specs)))).join(', ')) + "})";
    },
    samples: function(arg) {
      var specs;
      specs = arg.specs;
      return concat(repeat(map(function(arg1) {
        var k, v;
        k = arg1[0], v = arg1[1];
        return dict([[k, sample(v)]]);
      })(enumerate(specs))));
    },
    htmlInline: function(arg) {
      var specdict;
      specdict = arg.specs;
      return "<span class='type-maker unwrapped'>Select {<span class='folded-detail'>...</span>}</span>";
    },
    htmlBlock: function(arg) {
      var specdict;
      specdict = arg.specs;
      return {
        head: "<span class='type-maker'>Select {</span>",
        body: genBlockBody('select', 'field-name')(specdict),
        tail: "<span class='type-maker'>}</span>"
      };
    }
  });

  module.exports = {
    Select: Select
  };

}).call(this);

//# sourceMappingURL=../prim/select.js.map