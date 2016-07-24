(function() {
  var Loose, constraints, genBlockBody, htmlBlock, htmlInline, instance, isTypeSpecDict, match, ref, ref1, ref2, sample, samples, shape, show, typeclass;

  require('coffee-mate/global');

  ref = require('../typeclass'), typeclass = ref.typeclass, instance = ref.instance;

  ref1 = require('../typespec'), shape = ref1.shape, match = ref1.match, constraints = ref1.constraints, show = ref1.show, samples = ref1.samples, sample = ref1.sample, htmlInline = ref1.htmlInline, htmlBlock = ref1.htmlBlock;

  ref2 = require('../helpers'), genBlockBody = ref2.genBlockBody, isTypeSpecDict = ref2.isTypeSpecDict;

  Loose = (function() {
    function Loose(specdict) {
      if (!isTypeSpecDict(specdict)) {
        throw Error("Bad Loose Type Definition: Dict Of TypeSpec Expected, But Got " + specdict);
      }
      return {
        constructor: Loose,
        specdict: specdict
      };
    }

    return Loose;

  })();

  instance('TypeSpec')(Loose).where({
    shape: function(arg) {
      var specdict;
      specdict = arg.specdict;
      return Loose(fromList(map(function(arg1) {
        var k, spec;
        k = arg1[0], spec = arg1[1];
        return [k, shape(spec)];
      })(enumerate(specdict))));
    },
    match: function(arg) {
      var specdict;
      specdict = arg.specdict;
      return function(v) {
        return (v != null) && v.constructor === Object && (all(function(arg1) {
          var k, spec;
          k = arg1[0], spec = arg1[1];
          return match(spec)(v[k]);
        })(enumerate(specdict)));
      };
    },
    constraints: function(arg) {
      var specdict;
      specdict = arg.specdict;
      return function(v) {
        return cons({
          label: function() {
            return "Object Expected, But Got " + v;
          },
          flag: function() {
            return v != null;
          }
        })(map(function(arg1) {
          var k, spec;
          k = arg1[0], spec = arg1[1];
          return {
            label: function() {
              return "Field " + k;
            },
            sub: function() {
              return constraints(spec)(v[k]);
            }
          };
        })(enumerate(specdict)));
      };
    },
    show: function(arg) {
      var specdict;
      specdict = arg.specdict;
      return "Loose({" + ((list(map(function(arg1) {
        var k, spec;
        k = arg1[0], spec = arg1[1];
        return k + ": " + (show(spec));
      })(enumerate(specdict)))).join(', ')) + "})";
    },
    samples: function(arg) {
      var specdict;
      specdict = arg.specdict;
      return repeat(dict(list(map(function(arg1) {
        var k, v;
        k = arg1[0], v = arg1[1];
        return [k, sample(v)];
      })(enumerate(specdict)))));
    },
    htmlInline: function(arg) {
      var specdict;
      specdict = arg.specdict;
      return "<span class='type-maker unwrapped'>Loose {<span class='folded-detail'>...</span>}</span>";
    },
    htmlBlock: function(arg) {
      var specdict;
      specdict = arg.specdict;
      return {
        head: "<span class='type-maker'>Loose {</span>",
        body: genBlockBody('loose', 'field-name')(specdict),
        tail: "<span class='type-maker'>}</span>"
      };
    }
  });

  module.exports = {
    Loose: Loose
  };

}).call(this);

//# sourceMappingURL=../prim/loose.js.map