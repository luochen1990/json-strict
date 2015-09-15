(function() {
  var instance, match, ref, sample, samples, show;

  require('coffee-mate/global');

  instance = require('../typeclass').instance;

  ref = require('../typespec'), match = ref.match, show = ref.show, samples = ref.samples, sample = ref.sample;

  instance('TypeSpec')(Function).where({
    match: function(spec) {
      return function(v) {
        return (v != null) && v.constructor === spec;
      };
    },
    constraints: function(spec) {
      return function(v) {
        return [
          {
            label: function() {
              return "Non-Null Value Expected, But Got " + v;
            },
            flag: function() {
              return v != null;
            }
          }, {
            label: function() {
              var ref1, ref2;
              return "Value with Constructor " + ((ref1 = spec.name) != null ? ref1 : spec) + " Expected, But Got " + (json(v)) + " with Constructor " + ((ref2 = v.constructor.name) != null ? ref2 : v.constructor);
            },
            flag: function() {
              return v.constructor === spec;
            }
          }
        ];
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

//# sourceMappingURL=../prim/constructor.js.map