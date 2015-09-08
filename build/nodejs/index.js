(function() {
  var Any, Bool, Choose, Enum, Fn, Int, Loose, Map, NamedType, Nat, Optional, Promise, Select, Strict, Tree, TreeMap, UserInfo, UserName, Value, genRenderCode, htmlBlock, htmlInline, instance, match, ref, ref1, ref2, sample, samples, show, showHtml, showPage, typeclass;

  require('./prim/object');

  require('./prim/array');

  require('./prim/constructor');

  Bool = require('./prim/bool').Bool;

  Any = require('./prim/any').Any;

  Int = require('./prim/int').Int;

  Nat = require('./prim/nat').Nat;

  Enum = require('./prim/enum').Enum;

  Value = require('./prim/value').Value;

  Optional = require('./prim/optional').Optional;

  Promise = require('./prim/promise').Promise;

  Tree = require('./prim/tree').Tree;

  Map = require('./prim/map').Map;

  TreeMap = require('./prim/treemap').TreeMap;

  Fn = require('./prim/fn').Fn;

  NamedType = require('./prim/namedtype').NamedType;

  Strict = require('./prim/strict').Strict;

  Loose = require('./prim/loose').Loose;

  Select = require('./prim/select').Select;

  Choose = require('./prim/choose').Choose;

  ref = require('./typespec'), match = ref.match, show = ref.show, sample = ref.sample, samples = ref.samples, showHtml = ref.showHtml, htmlInline = ref.htmlInline, htmlBlock = ref.htmlBlock;

  ref1 = require('./render'), genRenderCode = ref1.genRenderCode, showPage = ref1.showPage;

  ref2 = require('./typeclass'), typeclass = ref2.typeclass, instance = ref2.instance;

  module.exports = {
    Number: Number,
    String: String,
    Bool: Bool,
    Any: Any,
    Int: Int,
    Nat: Nat,
    Enum: Enum,
    Value: Value,
    Optional: Optional,
    Promise: Promise,
    Tree: Tree,
    Map: Map,
    TreeMap: TreeMap,
    Fn: Fn,
    NamedType: NamedType,
    Strict: Strict,
    Loose: Loose,
    Select: Select,
    Choose: Choose,
    match: match,
    show: show,
    sample: sample,
    samples: samples,
    showHtml: showHtml,
    genRenderCode: genRenderCode,
    showPage: showPage
  };

  if (module.parent === null) {
    require('coffee-mate/global');
    UserName = Optional(String);
    UserInfo = {
      name: UserName,
      position: String,
      age: Number
    };
    assert(function() {
      return match(UserName)('luo') === true;
    });
    assert(function() {
      return match(UserName)(1) === false;
    });
    log(function() {
      return show(UserName);
    });
  }

}).call(this);

//# sourceMappingURL=index.js.map