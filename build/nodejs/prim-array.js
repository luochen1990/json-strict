(function() {
  var htmlBlock, htmlInline, instance, match, ref, sample, samples, show;

  require('coffee-mate/global');

  instance = require('./typeclass').instance;

  ref = require('./typespec'), match = ref.match, show = ref.show, samples = ref.samples, sample = ref.sample, htmlInline = ref.htmlInline, htmlBlock = ref.htmlBlock;

  instance('TypeSpec')(Array).where({
    match: function(arg) {
      var spec;
      spec = arg[0];
      return function(v) {
        return (v != null) && v.constructor === Array && (all(match(spec))(v));
      };
    },
    show: function(arg) {
      var spec;
      spec = arg[0];
      return "[" + (show(spec)) + "]";
    },
    samples: function(arg) {
      var spec;
      spec = arg[0];
      return concat(repeat(reverse(map(function(n) {
        return list(take(n)(samples(spec)));
      })(range(3)))));
    },
    sample: function(arg) {
      var spec;
      spec = arg[0];
      return [sample(spec)];
    },
    htmlInline: function(arg) {
      var spec;
      spec = arg[0];
      return "<span class='type-maker'>[" + (htmlInline(spec)) + "]</span>";
    },
    htmlBlock: function(arg) {
      var node, ref1, spec;
      spec = arg[0];
      if ((node = htmlBlock(spec)) == null) {
        return null;
      } else {
        return {
          head: "<span class='type-maker'>[" + node.head + "</span>",
          body: node.body,
          tail: "<span class='type-maker'>" + ((ref1 = node.tail) != null ? ref1 : '') + "]</span>"
        };
      }
    }
  });

}).call(this);

//# sourceMappingURL=prim-array.js.map