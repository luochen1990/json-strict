(function() {
  var OneOf, constraints, genBlockBody, htmlBlock, htmlInline, instance, isTypeSpec, match, ref, ref1, sample, samples, shape, show;

  require('coffee-mate/global');

  instance = require('../typeclass').instance;

  ref = require('../typespec'), shape = ref.shape, match = ref.match, constraints = ref.constraints, show = ref.show, samples = ref.samples, sample = ref.sample, htmlInline = ref.htmlInline, htmlBlock = ref.htmlBlock;

  ref1 = require('../helpers'), genBlockBody = ref1.genBlockBody, isTypeSpec = ref1.isTypeSpec;

  OneOf = (function() {
    function OneOf(specs) {
      if (!((specs != null) && specs.constructor === Array)) {
        throw Error("Bad OneOf Type Definition: Array Expected, But Got " + specs);
      }
      if (!all(isTypeSpec)(specs)) {
        throw Error("Bad OneOf Type Definition: Array of TypeSpec Expected, But Got " + specs);
      }
      log(function() {
        return specs.map(show);
      });
      return {
        constructor: OneOf,
        specs: specs
      };
    }

    return OneOf;

  })();

  instance('TypeSpec')(OneOf).where({
    match: function(arg) {
      var shaped, specs;
      specs = arg.specs;
      shaped = zip(map(shape)(specs), specs);
      return function(v) {
        var matchedShapes;
        matchedShapes = filter(function(arg1) {
          var _, sh;
          sh = arg1[0], _ = arg1[1];
          return match(sh)(v);
        })(shaped);
        return length(take(2)(matchedShapes)) === 1 && match(head(matchedShapes)[1])(v);
      };
    },
    constraints: function(arg) {
      var shaped, specs;
      specs = arg.specs;
      shaped = zip(map(shape)(specs), specs);
      return function(v) {
        var matchedCount, matchedShapes;
        matchedShapes = filter(function(arg1) {
          var _, sh;
          sh = arg1[0], _ = arg1[1];
          return match(sh)(v);
        })(shaped);
        matchedCount = length(take(2)(matchedShapes));
        return [
          {
            label: function() {
              return "Shape " + (list(map(show)(map(pluck(0))(shaped))).join(' | ')) + " Expected, But Got " + v;
            },
            flag: function() {
              return matchedCount > 0;
            }
          }, {
            label: function() {
              return "Ambiguous Shape " + (list(map(show)(map(pluck(0))(matchedShapes))).join(' | ')) + " Matched, Got " + (json(v));
            },
            flag: function() {
              return matchedCount < 2;
            }
          }, {
            label: function() {
              return "Shape " + (show(head(matchedShapes)[0]));
            },
            sub: function() {
              return constraints(head(matchedShapes)[1])(v);
            }
          }
        ];
      };
    },
    show: function(arg) {
      var specs;
      specs = arg.specs;
      return "(" + ((list(map(show)(specs))).join(' | ')) + ")";
    },
    samples: function(arg) {
      var specs;
      specs = arg.specs;
      return concat(repeat(map(sample)(specs)));
    },
    htmlInline: function(arg) {
      var specs;
      specs = arg.specs;
      return "<span class='type-maker unwrapped'>" + ((list(map(htmlInline)(specs))).join(' | ')) + "</span>";
    },
    htmlBlock: function(arg) {
      var specs;
      specs = arg.specs;
      return {
        head: "<span class='type-maker'>OneOf [</span>",
        body: genBlockBody('OneOf', 'meta-field')(dict(list(zip(naturals, specs)))),
        tail: "<span class='type-maker'>]</span>"
      };
    }
  });

  module.exports = {
    OneOf: OneOf
  };

}).call(this);

//# sourceMappingURL=../prim/oneof.js.map