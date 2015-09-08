(function() {
  var expandBlockHead, genBlockBody, htmlBlock, htmlInline, isTypeSpec, isTypeSpecDict, ref, typeclass;

  ref = require('./typespec'), htmlInline = ref.htmlInline, htmlBlock = ref.htmlBlock;

  typeclass = require('./typeclass').typeclass;

  expandBlockHead = function(f) {
    return function(spec) {
      var block;
      block = htmlBlock(spec);
      if (block == null) {
        return null;
      } else {
        return {
          head: f(block.head),
          body: block.body,
          tail: block.tail
        };
      }
    };
  };

  genBlockBody = function(bodyClass, keyClass) {
    return function(specdict) {
      var lis;
      lis = map(function(arg) {
        var block, k, ref1, ref2, v;
        k = arg[0], v = arg[1];
        block = htmlBlock(v);
        return "<li>\n<div class='" + (block != null ? 'fold' : 'inline') + "'>\n	<span class='" + keyClass + "'>" + k + "</span>: " + (htmlInline(v)) + "\n</div>\n" + (block != null ? "<div class='unfold'>\n	<span class='" + keyClass + "'>" + k + "</span>: " + block.head + "\n	" + ((ref1 = block.body) != null ? ref1 : '') + "\n	" + ((ref2 = block.tail) != null ? ref2 : '') + "\n</div>" : '') + "\n</li>";
      })(enumerate(specdict));
      return ("<ul class='" + bodyClass + "'>") + (list(lis)).join('\n') + "</ul>";
    };
  };

  isTypeSpec = function(spec) {
    return (spec != null) && typeclass('TypeSpec').hasInstance(spec.constructor);
  };

  isTypeSpecDict = function(specdict) {
    return (specdict != null) && all(function(arg) {
      var k, v;
      k = arg[0], v = arg[1];
      return isTypeSpec(v);
    })(enumerate(specdict));
  };

  module.exports = {
    expandBlockHead: expandBlockHead,
    genBlockBody: genBlockBody,
    isTypeSpec: isTypeSpec,
    isTypeSpecDict: isTypeSpecDict
  };

}).call(this);

//# sourceMappingURL=helpers.js.map