(function() {
  var Tree, constraints, expandBlockHead, htmlBlock, htmlInline, instance, isTypeSpec, match, ref, ref1, ref2, sample, samples, show, typeclass;

  require('coffee-mate/global');

  ref = require('../typeclass'), typeclass = ref.typeclass, instance = ref.instance;

  ref1 = require('../typespec'), match = ref1.match, constraints = ref1.constraints, show = ref1.show, samples = ref1.samples, sample = ref1.sample, htmlInline = ref1.htmlInline, htmlBlock = ref1.htmlBlock;

  ref2 = require('../helpers'), expandBlockHead = ref2.expandBlockHead, isTypeSpec = ref2.isTypeSpec;

  Tree = (function() {
    function Tree(labelSpec) {
      if (!isTypeSpec(labelSpec)) {
        throw Error("Bad Tree Type Definition: TypeSpec as labelSpec Expected");
      }
      return {
        constructor: Tree,
        labelSpec: labelSpec
      };
    }

    return Tree;

  })();

  instance('TypeSpec')(Tree).where({
    match: function(t) {
      return function(v) {
        var labelSpec;
        labelSpec = t.labelSpec;
        return (v != null) && (v.rootLabel != null) && (v.subForest != null) && v.subForest instanceof Array && match(labelSpec)(v.rootLabel) && all(match(t))(v.subForest);
      };
    },
    constraints: function(t) {
      var labelSpec;
      labelSpec = t.labelSpec;
      return function(v) {
        var ref3;
        return cons({
          label: function() {
            return (show(t)) + " Expected, But Got " + v;
          },
          flag: function() {
            return (v != null) && (v.rootLabel != null) && (v.subForest != null) && v.subForest instanceof Array;
          }
        })(cons({
          label: function() {
            return "Label Expected to be " + (show(labelSpec));
          },
          sub: function() {
            return constraints(labelSpec)(v.rootLabel);
          }
        })(map(function(x) {
          return {
            label: function() {
              return (show(t)) + " Expected";
            },
            sub: function() {
              return constraints(t)(x);
            }
          };
        })((ref3 = v != null ? v.subForest : void 0) != null ? ref3 : [])));
      };
    },
    show: function(arg) {
      var labelSpec;
      labelSpec = arg.labelSpec;
      return "T.Tree(" + (show(labelSpec)) + ")";
    },
    samples: function(arg) {
      var labelSpec, ls, s0, s1;
      labelSpec = arg.labelSpec;
      ls = list(take(2)(samples(labelSpec)));
      s0 = {
        rootLabel: ls[0],
        subForest: []
      };
      s1 = {
        rootLabel: ls[1],
        subForest: [s0]
      };
      return concat(repeat([s0, s1]));
    },
    htmlInline: function(arg) {
      var labelSpec;
      labelSpec = arg.labelSpec;
      return "<span class='type-maker unwrapped'>Tree " + (htmlInline(labelSpec)) + "</span>";
    },
    htmlBlock: function(arg) {
      var labelSpec;
      labelSpec = arg.labelSpec;
      return expandBlockHead(function(head) {
        return "<span class='type-maker'>Tree " + head + "</span>";
      })(labelSpec);
    }
  });

  module.exports = {
    Tree: Tree
  };

}).call(this);

//# sourceMappingURL=../prim/tree.js.map