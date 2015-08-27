(function() {
  var genBlockBody, htmlBlock, htmlInline, instance, match, ref, sample, samples, show;

  require('coffee-mate/global');

  instance = require('./typeclass').instance;

  ref = require('./typespec'), match = ref.match, show = ref.show, samples = ref.samples, sample = ref.sample, htmlInline = ref.htmlInline, htmlBlock = ref.htmlBlock;

  genBlockBody = require('./helpers').genBlockBody;

  instance('TypeSpec')(Object).where({
    match: function(specdict) {
      return function(v) {
        return (v != null) && v.constructor === Object && (all(function(k) {
          return specdict[k] != null;
        })(Object.keys(v))) && all(function(arg) {
          var k, spec;
          k = arg[0], spec = arg[1];
          return match(spec)(v[k]);
        })(enumerate(specdict));
      };
    },
    show: function(specdict) {
      return '{' + (list(map(function(arg) {
        var k, spec;
        k = arg[0], spec = arg[1];
        return k + ": " + (show(spec));
      })(enumerate(specdict)))).join(', ') + '}';
    },
    samples: function(specdict) {
      return repeat(dict(list(map(function(arg) {
        var k, v;
        k = arg[0], v = arg[1];
        return [k, sample(v)];
      })(enumerate(specdict)))));
    },
    htmlInline: function(specdict) {
      return "<span class='type-maker'>{<span class='folded-detail'>...</span>}</span>";
    },
    htmlBlock: function(specdict) {
      return {
        head: "<span class='type-maker'>{</span>",
        body: genBlockBody('object', 'field-name')(specdict),
        tail: "<span class='type-maker'>}</span>"
      };
    }
  });

}).call(this);

//# sourceMappingURL=prim-object.js.map