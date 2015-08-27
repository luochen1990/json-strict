(function() {
  var Map, genBlockBody, htmlBlock, htmlInline, instance, match, ref, ref1, sample, samples, show, typeclass;

  require('coffee-mate/global');

  ref = require('./typeclass'), typeclass = ref.typeclass, instance = ref.instance;

  ref1 = require('./typespec'), match = ref1.match, show = ref1.show, samples = ref1.samples, sample = ref1.sample, htmlInline = ref1.htmlInline, htmlBlock = ref1.htmlBlock;

  genBlockBody = require('./helpers').genBlockBody;

  Map = (function() {
    function Map(kspec) {
      assert(function() {
        return typeclass('TypeSpec').hasInstance(kspec.constructor);
      });
      return function(vspec) {
        assert(function() {
          return typeclass('TypeSpec').hasInstance(vspec.constructor);
        });
        return {
          constructor: Map,
          kspec: kspec,
          vspec: vspec
        };
      };
    }

    return Map;

  })();

  instance('TypeSpec')(Map).where({
    match: function(arg) {
      var kspec, vspec;
      kspec = arg.kspec, vspec = arg.vspec;
      return function(v) {
        var ks, mk, mv;
        mk = match(kspec);
        mv = match(vspec);
        return (v != null) && v.constructor === Object && all(mk)(ks = Object.keys(v)) && all(mv)(map(seek(v))(ks));
      };
    },
    show: function(arg) {
      var kspec, vspec;
      kspec = arg.kspec, vspec = arg.vspec;
      return "Map " + (show(kspec)) + " " + (show(vspec));
    },
    samples: function(arg) {
      var ks, kspec, vs, vspec;
      kspec = arg.kspec, vspec = arg.vspec;
      ks = list(take(4)(samples(kspec)));
      vs = list(take(4)(samples(vspec)));
      return concat(repeat([dict([[ks[0], vs[0]], [ks[1], vs[1]]]), dict([[ks[2], vs[2]], [ks[3], vs[3]]])]));
    },
    htmlInline: function(arg) {
      var kspec, vspec;
      kspec = arg.kspec, vspec = arg.vspec;
      return "<span class='type-maker unwrapped'>Map " + (htmlInline(kspec)) + " " + (htmlInline(vspec)) + "</span>";
    },
    htmlBlock: function(arg) {
      var kspec, vspec;
      kspec = arg.kspec, vspec = arg.vspec;
      return {
        head: "<span class='type-maker'>Map (</span>",
        body: genBlockBody('map', 'meta-field')({
          key: kspec,
          value: vspec
        }),
        tail: "<span class='type-maker'>)</span>"
      };
    }
  });

  module.exports = {
    Map: Map
  };

}).call(this);

//# sourceMappingURL=prim-map.js.map