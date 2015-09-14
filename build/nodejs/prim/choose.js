(function() {
  var Choose, genBlockBody, htmlBlock, htmlInline, instance, isTypeSpec, match, ref, ref1, sample, samples, show;

  require('coffee-mate/global');

  instance = require('../typeclass').instance;

  ref = require('../typespec'), match = ref.match, show = ref.show, samples = ref.samples, sample = ref.sample, htmlInline = ref.htmlInline, htmlBlock = ref.htmlBlock;

  ref1 = require('../helpers'), genBlockBody = ref1.genBlockBody, isTypeSpec = ref1.isTypeSpec;

  Choose = (function() {
    function Choose(specs) {
      if (!((specs != null) && specs.constructor === Array)) {
        throw Error("Bad Choose Type Definition: Array Expected, But Got " + specs);
      }
      if (!all(isTypeSpec)(specs)) {
        throw Error("Bad Choose Type Definition: Array of TypeSpec Expected, But Got " + specs);
      }
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
        return (v != null) && any(function(spec) {
          return match(spec)(v);
        })(specs);
      };
    },
    show: function(arg) {
      var specs;
      specs = arg.specs;
      return "Choose([" + ((list(map(show)(specs))).join(', ')) + "])";
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

//# sourceMappingURL=../prim/choose.js.map