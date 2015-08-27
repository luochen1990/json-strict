(function() {
  var Select, genBlockBody, htmlBlock, htmlInline, instance, match, ref, ref1, sample, samples, show, typeclass;

  require('coffee-mate/global');

  ref = require('./typeclass'), typeclass = ref.typeclass, instance = ref.instance;

  ref1 = require('./typespec'), match = ref1.match, show = ref1.show, samples = ref1.samples, sample = ref1.sample, htmlInline = ref1.htmlInline, htmlBlock = ref1.htmlBlock;

  genBlockBody = require('./helpers').genBlockBody;

  Select = (function() {
    function Select(specs) {
      assert(function() {
        return all(function(arg) {
          var k, spec;
          k = arg[0], spec = arg[1];
          return typeclass('TypeSpec').hasInstance(spec.constructor);
        })(enumerate(specs));
      });
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
        var ks, spec;
        return (v != null) && v.constructor === Object && (ks = Object.keys(v)).length === 1 && ((spec = specs[ks[0]]) != null) && (match(spec)(v));
      };
    },
    show: function(arg) {
      var specs;
      specs = arg.specs;
      return 'Select {' + (list(map(function(arg1) {
        var k, spec;
        k = arg1[0], spec = arg1[1];
        return k + ": " + (show(spec));
      })(enumerate(specs)))).join(', ') + '}';
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

//# sourceMappingURL=prim-select.js.map