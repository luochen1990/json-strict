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
    constraints: function() {
      return function(v) {
        return [
          {
            label: function() {
              return "Any Non-Null Value Expected, But Got " + v;
            },
            flag: function() {
              return v != null;
            }
          }
        ];
      };
    },
    show: function() {
      return "Any";
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