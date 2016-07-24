(function() {
  var Strict, constraints, genBlockBody, htmlBlock, htmlInline, instance, isTypeSpecDict, match, ref, ref1, sample, samples, shape, show;

  require('coffee-mate/global');

  instance = require('../typeclass').instance;

  ref = require('../typespec'), shape = ref.shape, match = ref.match, constraints = ref.constraints, show = ref.show, samples = ref.samples, sample = ref.sample, htmlInline = ref.htmlInline, htmlBlock = ref.htmlBlock;

  ref1 = require('../helpers'), genBlockBody = ref1.genBlockBody, isTypeSpecDict = ref1.isTypeSpecDict;

  Strict = (function() {
    function Strict(specdict) {
      if (!isTypeSpecDict(specdict)) {
        throw Error("Bad Strict Type Definition: Dict Of TypeSpec Expected, But Got " + specdict);
      }
      return {
        constructor: Strict,
        specdict: specdict
      };
    }

    return Strict;

  })();

  instance('TypeSpec')(Strict).where({
    shape: function(arg) {
      var specdict;
      specdict = arg.specdict;
      return Strict(fromList(map(function(arg1) {
        var k, spec;
        k = arg1[0], spec = arg1[1];
        return [k, shape(spec)];
      })(enumerate(specdict))));
    },
    match: function(arg) {
      var specdict;
      specdict = arg.specdict;
      return function(v) {
        return (v != null) && v.constructor === Object && (all(function(k) {
          return specdict[k] != null;
        })(Object.keys(v))) && all(function(arg1) {
          var k, spec;
          k = arg1[0], spec = arg1[1];
          return match(spec)(v[k]);
        })(enumerate(specdict));
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
        })(cons({
          label: function() {
            return "Redundant Keys: " + (list(filter(function(k) {
              return specdict[k] == null;
            })(Object.keys(v))));
          },
          flag: function() {
            return all(function(k) {
              return specdict[k] != null;
            })(Object.keys(v));
          }
        })(map(function(arg1) {
          var k, spec;
          k = arg1[0], spec = arg1[1];
          return {
            label: function() {
              return "Field " + k + " Expected to be " + (show(spec));
            },
            sub: function() {
              return constraints(spec)(v[k]);
            }
          };
        })(enumerate(specdict))));
      };
    },
    show: function(arg) {
      var specdict;
      specdict = arg.specdict;
      return "{" + ((list(map(function(arg1) {
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
      return "<span class='type-maker'>{<span class='folded-detail'>...</span>}</span>";
    },
    htmlBlock: function(arg) {
      var specdict;
      specdict = arg.specdict;
      return {
        head: "<span class='type-maker'>{</span>",
        body: genBlockBody('strict', 'field-name')(specdict),
        tail: "<span class='type-maker'>}</span>"
      };
    }
  });

  module.exports = {
    Strict: Strict
  };

}).call(this);

//# sourceMappingURL=../prim/strict.js.map