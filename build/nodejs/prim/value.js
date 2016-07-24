(function() {
  var Value, instance;

  require('coffee-mate/global');

  instance = require('../typeclass').instance;

  Value = (function() {
    function Value(v) {
      if (v == null) {
        throw Error("Bad Value Type Definition: Non-null Value Expected, But Got " + v);
      }
      return {
        constructor: Value,
        value: v
      };
    }

    return Value;

  })();

  instance('TypeSpec')(Value).where({
    shape: function(spec) {
      return spec;
    },
    match: function(arg) {
      var value;
      value = arg.value;
      return function(v) {
        return v === value;
      };
    },
    show: function(arg) {
      var value;
      value = arg.value;
      return "" + (json(value));
    },
    samples: function(arg) {
      var value;
      value = arg.value;
      return repeat(value);
    },
    htmlInline: function(arg) {
      var value;
      value = arg.value;
      return "<span class='type-maker unwrapped'>Value " + (json(value)) + "</span>";
    }
  });

  module.exports = {
    Value: Value
  };

}).call(this);

//# sourceMappingURL=../prim/value.js.map