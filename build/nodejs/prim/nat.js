(function() {
  var Nat, instance;

  require('coffee-mate/global');

  instance = require('../typeclass').instance;

  Nat = (function() {
    var r;
    r = function Nat(){};
    return (r.constructor = r);
  })();

  instance('TypeSpec')(Nat).where({
    match: function() {
      return function(v) {
        return (v != null) && v.constructor === Number && !isNaN(v) && v >= 0 && v === parseInt(v);
      };
    },
    constraints: function() {
      return function(v) {
        return [
          {
            label: function() {
              return "Nat Excepted, But Got " + (json(v));
            },
            flag: function() {
              return (v != null) && v.constructor === Number && !isNaN(v) && v >= 0 && v === parseInt(v);
            }
          }
        ];
      };
    },
    show: function() {
      return "Nat";
    },
    samples: function() {
      return concat(repeat([42, 1, 2]));
    }
  });

  module.exports = {
    Nat: Nat
  };

}).call(this);

//# sourceMappingURL=../prim/nat.js.map