(function() {
  var Fn, genBlockBody, htmlBlock, htmlInline, instance, match, ref, ref1, sample, samples, show, typeclass;

  require('coffee-mate/global');

  ref = require('../typeclass'), typeclass = ref.typeclass, instance = ref.instance;

  ref1 = require('../typespec'), match = ref1.match, show = ref1.show, samples = ref1.samples, sample = ref1.sample, htmlInline = ref1.htmlInline, htmlBlock = ref1.htmlBlock;

  genBlockBody = require('../helpers').genBlockBody;

  Fn = (function() {
    function Fn(ispec) {
      if (!((ispec != null) && typeclass('TypeSpec').hasInstance(ispec.constructor))) {
        throw Error("Bad Fn Definition: TypeSpec as ispec Expected, But Got " + ispec);
      }
      return function(ospec) {
        if (!((ospec != null) && typeclass('TypeSpec').hasInstance(ospec.constructor))) {
          throw Error("Bad Fn Definition: TypeSpec as ospec Expected, But Got " + ospec);
        }
        return {
          constructor: Fn,
          ispec: ispec,
          ospec: ospec
        };
      };
    }

    return Fn;

  })();

  instance('TypeSpec')(Fn).where({
    match: function(arg) {
      var ispec, ospec;
      ispec = arg.ispec, ospec = arg.ospec;
      return function(v) {
        return (v != null) && v.constructor === Function;
      };
    },
    withSpec: function(arg) {
      var ispec, ospec;
      ispec = arg.ispec, ospec = arg.ospec;
      return function(v) {
        if (!((v != null) && v.constructor === Function)) {
          throw TypeError({
            expected: 'Function',
            got: v
          });
        } else {
          return function(x) {
            var y;
            withSpec(ispec)(x);
            y = v(x);
            withSpec(ospec)(y);
            return y;
          };
        }
      };
    },
    show: function(arg) {
      var ispec, ospec;
      ispec = arg.ispec, ospec = arg.ospec;
      return "Fn(" + (show(ispec)) + ")(" + (show(ospec)) + ")";
    },
    samples: function(arg) {
      var ispec, ospec;
      ispec = arg.ispec, ospec = arg.ospec;
      return repeat({
        "[input]": sample(ispec),
        "[output]": sample(ospec)
      });
    },
    htmlInline: function(arg) {
      var ispec, ospec;
      ispec = arg.ispec, ospec = arg.ospec;
      return "<span class='type-maker unwrapped'>" + (htmlInline(ispec)) + " -> " + (htmlInline(ospec)) + "</span>";
    },
    htmlBlock: function(arg) {
      var ispec, ospec;
      ispec = arg.ispec, ospec = arg.ospec;
      return {
        head: "<span class='type-maker'>Function (</span>",
        body: genBlockBody('function', 'meta-field')({
          input: ispec,
          output: ospec
        }),
        tail: "<span class='type-maker'>)</span>"
      };
    }
  });

  module.exports = {
    Fn: Fn
  };

}).call(this);

//# sourceMappingURL=../prim/fn.js.map