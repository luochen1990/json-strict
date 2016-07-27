(function() {
  var Int, instance;

  require('coffee-mate/global');

  instance = require('../typeclass').instance;

  Int = (function() {
    var r;
    r = function Int(){};
    return (r.constructor = r);
  })();

  instance('TypeSpec')(Int).where({
    shape: function() {
      return Number;
    },
    match: function() {
      return function(v) {
        return (v != null) && v.constructor === Number && !isNaN(v) && v === parseInt(v);
      };
    },
    constraints: function() {
      return function(v) {
        return [
          {
            label: function() {
              return "Int Excepted, But Got " + (json(v));
            },
            flag: function() {
              return (v != null) && v.constructor === Number && !isNaN(v) && v === parseInt(v);
            }
          }
        ];
      };
    },
    show: function() {
      return "Int";
    },
    samples: function() {
      return concat(repeat([42, 1, 2]));
    }
  });

  module.exports = {
    Int: Int
  };

}).call(this);

//# sourceMappingURL=../prim/int.js.map