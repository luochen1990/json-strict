(function() {
  var Promise, expandBlockHead, htmlBlock, htmlInline, instance, isTypeSpec, match, ref, ref1, ref2, sample, samples, show, typeclass;

  require('coffee-mate/global');

  ref = require('../typeclass'), typeclass = ref.typeclass, instance = ref.instance;

  ref1 = require('../typespec'), match = ref1.match, show = ref1.show, samples = ref1.samples, sample = ref1.sample, htmlInline = ref1.htmlInline, htmlBlock = ref1.htmlBlock;

  ref2 = require('../helpers'), expandBlockHead = ref2.expandBlockHead, isTypeSpec = ref2.isTypeSpec;

  Promise = (function() {
    function Promise(spec) {
      if (!isTypeSpec(spec)) {
        throw Error("Bad Optional Type Definition: TypeSpec as spec Expected");
      }
      return {
        constructor: Promise,
        spec: spec
      };
    }

    return Promise;

  })();

  instance('TypeSpec')(Promise).where({
    match: function(arg) {
      var spec;
      spec = arg.spec;
      return function(v) {
        return (v != null ? v.then : void 0) != null;
      };
    },
    constraints: function(t) {
      return function(v) {
        return [
          {
            label: function() {
              return (show(t)) + " Expected, But Got " + v;
            },
            flag: function() {
              return (v != null ? v.then : void 0) != null;
            }
          }
        ];
      };
    },
    withSpec: function(arg) {
      var spec;
      spec = arg.spec;
      return function(v) {
        if ((v != null ? v.then : void 0) == null) {
          throw TypeError({
            expected: 'Promise',
            got: v
          });
        } else {
          return v.then(function(x) {
            withSpec(spec)(x);
            return x;
          });
        }
      };
    },
    show: function(arg) {
      var spec;
      spec = arg.spec;
      return "T.Promise(" + (show(spec)) + ")";
    },
    samples: function(arg) {
      var spec;
      spec = arg.spec;
      return samples(spec);
    },
    htmlInline: function(arg) {
      var spec;
      spec = arg.spec;
      return "<span class='type-maker unwrapped'>Promise " + (htmlInline(spec)) + "</span>";
    },
    htmlBlock: function(arg) {
      var spec;
      spec = arg.spec;
      return expandBlockHead(function(head) {
        return "<span class='type-maker'>Promise " + head + "</span>";
      })(spec);
    }
  });

  module.exports = {
    Promise: Promise
  };

}).call(this);

//# sourceMappingURL=../prim/promise.js.map