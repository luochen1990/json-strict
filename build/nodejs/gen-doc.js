(function() {
  var expand, foreach, fs, genDocuments, log, mkdir, readdir, ref, showPage, write;

  require("coffee-script").register();

  ref = require('coffee-mate'), log = ref.log, foreach = ref.foreach;

  showPage = require('./render').showPage;

  mkdir = require('shelljs').mkdir;

  expand = require('path').resolve;

  fs = require('fs');

  write = function(fname, s) {
    var dir, i;
    i = fname.lastIndexOf('/');
    if (i >= 0) {
      dir = fname.slice(0, +i + 1 || 9e9);
      mkdir('-p', dir);
    }
    return fs.writeFileSync(fname, s);
  };

  readdir = function(path, min_depth) {
    var j, len, ls, rec, results, s;
    if (min_depth == null) {
      min_depth = 0;
    }
    ls = [];
    rec = function(path, depth) {
      return fs.readdirSync(path).forEach(function(item) {
        var p;
        p = path + "/" + item;
        if (fs.statSync(p).isDirectory()) {
          return rec(p, depth + 1);
        } else {
          if (depth >= min_depth) {
            return ls.push(p);
          }
        }
      });
    };
    rec(path, 0);
    results = [];
    for (j = 0, len = ls.length; j < len; j++) {
      s = ls[j];
      results.push(s.slice(path.length + 1));
    }
    return results;
  };

  genDocuments = function(arg) {
    var dest, src;
    src = arg.src, dest = arg.dest;
    if (!/\/$/.test(src)) {
      src += '/';
    }
    if (!/\/$/.test(dest)) {
      dest += '/';
    }
    return foreach(readdir(src), function(fname) {
      var it, page, pageName;
      if (/(.coffee|.litcoffee|.js)$/.test(fname)) {
        it = require(expand(src + "/" + fname));
        page = showPage(it);
        page += "<style>\n* {\n	line-height: 1.2em\n}\n.typespec .sample pre {\n	max-height: none !important;\n}\n</style>";
        pageName = fname.replace(/(.coffee|.litcoffee|.js)$/, '.html');
        return write(dest + pageName, page);
      }
    });
  };

  module.exports = {
    genDocuments: genDocuments
  };

}).call(this);

//# sourceMappingURL=gen-doc.js.map