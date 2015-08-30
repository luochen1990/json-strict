(function() {
  var Loose, genBlockBody, htmlBlock, htmlInline, instance, match, ref, ref1, sample, samples, show, typeclass;

  require('coffee-mate/global');

  ref = require('./typeclass'), typeclass = ref.typeclass, instance = ref.instance;

  ref1 = require('./typespec'), match = ref1.match, show = ref1.show, samples = ref1.samples, sample = ref1.sample, htmlInline = ref1.htmlInline, htmlBlock = ref1.htmlBlock;

  genBlockBody = require('./helpers').genBlockBody;

  Loose = (function() {
    function Loose(specdict) {
      assert(function() {
        return all(function(arg) {
          var k, spec;
          k = arg[0], spec = arg[1];
          return typeclass('TypeSpec').hasInstance(spec.constructor);
        })(enumerate(specdict));
      });
      return {
        constructor: Loose,
        specdict: specdict
      };
    }

    return Loose;

  })();

  instance('TypeSpec')(Loose).where({
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
    show: function(arg) {
      var specdict;
      specdict = arg.specdict;
      return 'Loose {' + (list(map(function(arg1) {
        var k, spec;
        k = arg1[0], spec = arg1[1];
        return k + ": " + (show(spec));
      })(enumerate(specdict)))).join(', ') + '}';
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

//# sourceMappingURL=prim-loose.js.map