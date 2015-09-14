(function() {
  var TreeMap, genBlockBody, htmlBlock, htmlInline, instance, isTypeSpec, match, ref, ref1, ref2, sample, samples, show, typeclass;

  require('coffee-mate/global');

  ref = require('../typeclass'), typeclass = ref.typeclass, instance = ref.instance;

  ref1 = require('../typespec'), match = ref1.match, show = ref1.show, samples = ref1.samples, sample = ref1.sample, htmlInline = ref1.htmlInline, htmlBlock = ref1.htmlBlock;

  ref2 = require('../helpers'), genBlockBody = ref2.genBlockBody, isTypeSpec = ref2.isTypeSpec;

  TreeMap = (function() {
    function TreeMap(kspec) {
      if (!isTypeSpec(kspec)) {
        throw Error("Bad TreeMap Type Definition: TypeSpec as kspec Expected");
      }
      return function(vspec) {
        if (!isTypeSpec(vspec)) {
          throw Error("Bad TreeMap Type Definition: TypeSpec as vspec Expected");
        }
        return {
          constructor: TreeMap,
          kspec: kspec,
          vspec: vspec
        };
      };
    }

    return TreeMap;

  })();

  instance('TypeSpec')(TreeMap).where({
    match: function(t) {
      return function(v) {
        var ks, kspec, mk, mv, tag, vspec;
        kspec = t.kspec, vspec = t.vspec;
        mk = match(kspec);
        mv = match(t);
        return (v != null) && v.constructor === Object && ((((tag = Object.keys(v)[0]) === 'node') && (all(mk)(ks = Object.keys(v.node)) && all(mv)(map(seek(v.node))(ks)))) || (tag === 'leaf' && match(vspec)(v.leaf)));
      };
    },
    show: function(arg) {
      var kspec, vspec;
      kspec = arg.kspec, vspec = arg.vspec;
      return "T.TreeMap(" + (show(kspec)) + ")(" + (show(vspec)) + ")";
    },
    samples: function(arg) {
      var ks, kspec, vs, vspec;
      kspec = arg.kspec, vspec = arg.vspec;
      ks = list(take(4)(samples(kspec)));
      vs = list(take(3)(samples(vspec)));
      return concat(repeat([
        {
          node: dict([
            [
              ks[0], {
                node: dict([
                  [
                    ks[2], {
                      leaf: vs[0]
                    }
                  ], [
                    ks[3], {
                      leaf: vs[1]
                    }
                  ]
                ])
              }
            ], [
              ks[1], {
                leaf: vs[2]
              }
            ]
          ])
        }
      ]));
    },
    htmlInline: function(arg) {
      var kspec, vspec;
      kspec = arg.kspec, vspec = arg.vspec;
      return "<span class='type-maker unwrapped'>TreeMap " + (htmlInline(kspec)) + " " + (htmlInline(vspec)) + "</span>";
    },
    htmlBlock: function(arg) {
      var kspec, vspec;
      kspec = arg.kspec, vspec = arg.vspec;
      return {
        head: "<span class='type-maker'>TreeMap (</span>",
        body: genBlockBody('treemap', 'meta-field')({
          key: kspec,
          value: vspec
        }),
        tail: "<span class='type-maker'>)</span>"
      };
    }
  });

  module.exports = {
    TreeMap: TreeMap
  };

}).call(this);

//# sourceMappingURL=../prim/treemap.js.map