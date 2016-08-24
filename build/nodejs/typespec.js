(function() {
  var Any, TypeSpec, constraints, typeclass, unmatchMessages;

  require('coffee-mate/global');

  typeclass = require('./typeclass').typeclass;

  Any = require('./prim/any').Any;

  TypeSpec = typeclass('TypeSpec').where({
    match: null,
    shape: function(t) {
      return Any;
    },
    constraints: function(t) {
      return (function(_this) {
        return function(v) {
          return [
            {
              label: function() {
                return (_this.show(t)) + " Expected, But Got " + (json(v));
              },
              flag: function() {
                return _this.match(t)(v);
              }
            }
          ];
        };
      })(this);
    },
    withSpec: function(t) {
      return function(v) {
        if (!this.match(t)(v)) {
          throw TypeError({
            expected: this.show(t),
            got: v
          });
        } else {
          return v;
        }
      };
    },
    show: function(t) {
      return t.name || 'UnnamedType';
    },
    samples: null,
    sample: function(t) {
      return head(this.samples(t));
    },
    htmlInline: function(t) {
      return "<span class='type-maker'>" + (this.show(t)) + "</span>";
    },
    htmlBlock: function(t) {
      return null;
    },
    showHtml: function(t) {
      var samplePart, specPart;
      specPart = (function(_this) {
        return function() {
          var block, ref, ref1;
          block = _this.htmlBlock(t);
          return ("<div class='spec'>\n<div class='" + (block != null ? 'fold' : 'inline') + "'><span class='meta-field'>spec</span>: " + (_this.htmlInline(t)) + "</div>\n" + (block != null ? "<div class='unfold'>\n	<span class='meta-field'>spec</span>: " + block.head + "\n	" + ((ref = block.body) != null ? ref : '') + "\n	" + ((ref1 = block.tail) != null ? ref1 : '') + "\n</div>" : '') + "\n</div>").replace(/(\t|\n)/g, '');
        };
      })(this)();
      samplePart = (function(_this) {
        return function() {
          var s;
          s = json(_this.sample(t), 4);
          return "<div class='sample'>\n<span class='meta-field'>sample</span>: " + (/\n/.test(s) ? "<pre class='code'>" + s + "</pre>" : "<span class='code'>" + s + "</span>") + "\n</div>";
        };
      })(this)();
      return "<div class='typespec'>" + (specPart + samplePart) + "</div>";
    }
  });

  constraints = TypeSpec.constraints;

  unmatchMessages = function(spec) {
    return function(v) {
      var r, rec;
      r = [];
      rec = function(ls) {
        var rst;
        rst = true;
        foreach(ls, function(arg) {
          var flag, label, sub;
          label = arg.label, flag = arg.flag, sub = arg.sub;
          if (flag != null) {
            if (flag() === false) {
              r.push(label());
              rst = false;
              return foreach["break"];
            }
          } else if (sub != null) {
            if (rec(sub()) === false) {
              r.push(label());
              rst = false;
              return foreach["break"];
            }
          }
        });
        return rst;
      };
      rec(constraints(spec)(v));
      return r.reverse();
    };
  };

  module.exports = extend({
    unmatchMessages: unmatchMessages
  })(TypeSpec);

}).call(this);

//# sourceMappingURL=typespec.js.map