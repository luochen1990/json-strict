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
    match: function() {
      return function(v) {
        return (v != null) && v.constructor === Number && !isNaN(v) && v === parseInt(v);
      };
    },
    show: function() {
      return "T.Int";
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