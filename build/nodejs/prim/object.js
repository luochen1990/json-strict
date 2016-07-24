(function() {
  var constraints, genBlockBody, htmlBlock, htmlInline, instance, isTypeSpecDict, match, ref, ref1, sample, samples, shape, show, specdictChecked;

  require('coffee-mate/global');

  instance = require('../typeclass').instance;

  ref = require('../typespec'), shape = ref.shape, match = ref.match, constraints = ref.constraints, show = ref.show, samples = ref.samples, sample = ref.sample, htmlInline = ref.htmlInline, htmlBlock = ref.htmlBlock;

  ref1 = require('../helpers'), genBlockBody = ref1.genBlockBody, isTypeSpecDict = ref1.isTypeSpecDict;

  specdictChecked = function(f) {
    return function(specdict) {
      if (!isTypeSpecDict(specdict)) {
        throw Error("Bad Object Type Definition: Dict Of TypeSpec Expected, But Got " + specdict);
      }
      return f(specdict);
    };
  };

  instance('TypeSpec')(Object).where({
    shape: function(specdict) {
      return fromList(map(function(arg) {
        var k, spec;
        k = arg[0], spec = arg[1];
        return [k, shape(spec)];
      })(enumerate(specdict)));
    },
    match: specdictChecked(function(specdict) {
      return function(v) {
        return (v != null) && (all(function(k) {
          return specdict[k] != null;
        })(Object.keys(v))) && all(function(arg) {
          var k, spec;
          k = arg[0], spec = arg[1];
          return match(spec)(v[k]);
        })(enumerate(specdict));
      };
    }),
    constraints: function(specdict) {
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
        })(map(function(arg) {
          var k, spec;
          k = arg[0], spec = arg[1];
          return {
            label: function() {
              return "Field " + k;
            },
            sub: function() {
              return constraints(spec)(v[k]);
            }
          };
        })(enumerate(specdict))));
      };
    },
    show: specdictChecked(function(specdict) {
      return "{" + ((list(map(function(arg) {
        var k, spec;
        k = arg[0], spec = arg[1];
        return k + ": " + (show(spec));
      })(enumerate(specdict)))).join(', ')) + "}";
    }),
    samples: specdictChecked(function(specdict) {
      return repeat(dict(list(map(function(arg) {
        var k, v;
        k = arg[0], v = arg[1];
        return [k, sample(v)];
      })(enumerate(specdict)))));
    }),
    htmlInline: specdictChecked(function(specdict) {
      return "<span class='type-maker'>{<span class='folded-detail'>...</span>}</span>";
    }),
    htmlBlock: specdictChecked(function(specdict) {
      return {
        head: "<span class='type-maker'>{</span>",
        body: genBlockBody('object', 'field-name')(specdict),
        tail: "<span class='type-maker'>}</span>"
      };
    })
  });

}).call(this);

//# sourceMappingURL=../prim/object.js.map