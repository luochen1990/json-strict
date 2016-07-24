(function() {
  var Optional, constraints, expandBlockHead, htmlBlock, htmlInline, instance, isTypeSpec, match, ref, ref1, ref2, sample, samples, show, typeclass;

  require('coffee-mate/global');

  ref = require('../typeclass'), typeclass = ref.typeclass, instance = ref.instance;

  ref1 = require('../typespec'), match = ref1.match, constraints = ref1.constraints, show = ref1.show, samples = ref1.samples, sample = ref1.sample, htmlInline = ref1.htmlInline, htmlBlock = ref1.htmlBlock;

  ref2 = require('../helpers'), expandBlockHead = ref2.expandBlockHead, isTypeSpec = ref2.isTypeSpec;

  Optional = (function() {
    function Optional(spec) {
      if (!isTypeSpec(spec)) {
        throw Error("Bad Optional Type Definition: TypeSpec as spec Expected");
      }
      return {
        constructor: Optional,
        spec: spec
      };
    }

    return Optional;

  })();

  instance('TypeSpec')(Optional).where({
    shape: function(arg) {
      var spec;
      spec = arg.spec;
      return Optional(shape(spec));
    },
    match: function(arg) {
      var spec;
      spec = arg.spec;
      return function(v) {
        return (v == null) || match(spec)(v);
      };
    },
    constraints: function(t) {
      return function(v) {
        if (v == null) {
          return [];
        } else {
          return [
            {
              label: function() {
                return (show(t)) + " Expected";
              },
              sub: function() {
                return constraints(t.spec)(v);
              }
            }
          ];
        }
      };
    },
    show: function(arg) {
      var spec;
      spec = arg.spec;
      return "Optional(" + (show(spec)) + ")";
    },
    samples: function(arg) {
      var ls, spec;
      spec = arg.spec;
      ls = list(take(2)(samples(spec)));
      return concat(repeat([ls[0], null, ls[1], void 0]));
    },
    htmlInline: function(arg) {
      var spec;
      spec = arg.spec;
      return "<span class='type-maker unwrapped'>Optional " + (htmlInline(spec)) + "</span>";
    },
    htmlBlock: function(arg) {
      var spec;
      spec = arg.spec;
      return expandBlockHead(function(head) {
        return "<span class='type-maker'>Optional " + head + "</span>";
      })(spec);
    }
  });

  module.exports = {
    Optional: Optional
  };

}).call(this);

//# sourceMappingURL=../prim/optional.js.map