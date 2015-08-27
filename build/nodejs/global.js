(function() {
  var index, k, v;

  index = require('./index');

  for (k in index) {
    v = index[k];
    global[k] = v;
  }

}).call(this);

//# sourceMappingURL=global.js.map