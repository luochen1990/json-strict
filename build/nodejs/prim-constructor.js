(function() {
  var instance, match, ref, sample, samples, show;

  require('coffee-mate/global');

  instance = require('./typeclass').instance;

  ref = require('./typespec'), match = ref.match, show = ref.show, samples = ref.samples, sample = ref.sample;

  instance('TypeSpec')(Function).where({
    match: function(spec) {
      return function(v) {
        return (v != null) && v.constructor === spec;
      };
    },
    show: function(spec) {
      return spec.name || 'UnnamedType';
    },
    samples: function(spec) {
      switch (spec) {
        case Boolean:
          return concat(repeat([true, false]));
        case Number:
          return concat(repeat([3.14, 9, 42]));
        case String:
          return concat(repeat(['abc', 'hello']));
        default:
          return repeat(new spec);
      }
    },
    htmlInline: function(spec) {
      return "<span class='type-maker'>" + (show(spec)) + "</span>";
    }
  });

}).call(this);

//# sourceMappingURL=prim-constructor.js.map