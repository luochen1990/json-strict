(function() {
  var Enum, instance,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  require('coffee-mate/global');

  instance = require('../typeclass').instance;

  Enum = (function() {
    function Enum(ls) {
      if (!(all(function(x) {
        return x != null;
      })(ls))) {
        throw Error("Bad Enum Type Definition: Array Of Non-null Values Expected, Bot Got " + ls);
      }
      return {
        constructor: Enum,
        "enum": ls
      };
    }

    return Enum;

  })();

  instance('TypeSpec')(Enum).where({
    match: function(arg) {
      var vs;
      vs = arg["enum"];
      return function(v) {
        return indexOf.call(vs, v) >= 0;
      };
    },
    show: function(arg) {
      var vs;
      vs = arg["enum"];
      return "T.Enum(" + (json(vs)) + ")";
    },
    samples: function(arg) {
      var vs;
      vs = arg["enum"];
      return concat(repeat(vs));
    },
    htmlInline: function(arg) {
      var vs;
      vs = arg["enum"];
      return "<span class='type-maker unwrapped'>Enum " + (json(vs)) + "</span>";
    }
  });

  module.exports = {
    Enum: Enum
  };

}).call(this);

//# sourceMappingURL=../prim/enum.js.map