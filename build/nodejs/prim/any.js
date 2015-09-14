(function() {
  var Any, instance;

  require('coffee-mate/global');

  instance = require('../typeclass').instance;

  Any = (function() {
    var r;
    r = function Any(){};
    return (r.constructor = r);
  })();

  instance('TypeSpec')(Any).where({
    match: function() {
      return function(v) {
        return v != null;
      };
    },
    show: function() {
      return "T.Any";
    },
    samples: function() {
      return concat(repeat([
        'a', 3, true, [1, 2], {
          x: 1
        }
      ]));
    },
    sample: function() {
      return 'any';
    }
  });

  module.exports = {
    Any: Any
  };

}).call(this);

//# sourceMappingURL=../prim/any.js.map