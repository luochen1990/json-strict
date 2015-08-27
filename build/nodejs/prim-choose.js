(function() {
  var Choose, genBlockBody, htmlBlock, htmlInline, instance, match, ref, ref1, sample, samples, show, typeclass;

  require('coffee-mate/global');

  ref = require('./typeclass'), typeclass = ref.typeclass, instance = ref.instance;

  ref1 = require('./typespec'), match = ref1.match, show = ref1.show, samples = ref1.samples, sample = ref1.sample, htmlInline = ref1.htmlInline, htmlBlock = ref1.htmlBlock;

  genBlockBody = require('./helpers').genBlockBody;

  Choose = (function() {
    function Choose(specs) {
      assert(function() {
        return (specs != null) && specs.constructor === Array;
      });
      assert(function() {
        return all(function(x) {
          return (x != null) && typeclass('TypeSpec').hasInstance(x.constructor);
        })(specs);
      });
      return {
        constructor: Choose,
        specs: specs
      };
    }

    return Choose;

  })();

  instance('TypeSpec')(Choose).where({
    match: function(arg) {
      var specs;
      specs = arg.specs;
      return function(v) {
        return (v != null) && all(match(spec)(v));
      };
    },
    show: function(arg) {
      var specs;
      specs = arg.specs;
      return (list(map(show)(specs))).join(' | ');
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
        head: "<span class='type-maker'>Choose [</span>",
        body: genBlockBody('choose', 'meta-field')(dict(list(zip(naturals, specs)))),
        tail: "<span class='type-maker'>]</span>"
      };
    }
  });

  module.exports = {
    Choose: Choose
  };

}).call(this);

//# sourceMappingURL=prim-choose.js.map