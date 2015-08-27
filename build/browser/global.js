(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.__lazy = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            currentQueue[queueIndex].run();
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],3:[function(require,module,exports){
(function() {
  var this_module,
    slice = [].slice;

  this_module = function(arg) {
    var abs, accept_multi_or_array, best, ceil, combine, curry2, curry3, equal, flip, floor, greaterEqual, greaterThan, lessEqual, lessThan, max, max_index, min, min_index, minus, notEqual, pack, pluck, plus, precise, seek, sum, uncurry2, uncurry3, unpack;
    best = arg.best;
    flip = function(f) {
      return function(x) {
        return function(y) {
          return f(y)(x);
        };
      };
    };
    combine = function(f) {
      return function(g) {
        return function(x) {
          return f(g(x));
        };
      };
    };
    curry2 = function(f) {
      return function(a) {
        return function(b) {
          return f(a, b);
        };
      };
    };
    curry3 = function(f) {
      return function(a) {
        return function(b) {
          return function(c) {
            return f(a, b, c);
          };
        };
      };
    };
    uncurry2 = function(f) {
      return function(a, b) {
        return f(a)(b);
      };
    };
    uncurry3 = function(f) {
      return function(a, b, c) {
        return f(a)(b)(c);
      };
    };
    pack = function(f) {
      return function(arr) {
        return f.apply(null, arr);
      };
    };
    unpack = function(f) {
      return function() {
        var arr;
        arr = 1 <= arguments.length ? slice.call(arguments, 0) : [];
        return f(arr);
      };
    };
    seek = function(arr) {
      return function(i) {
        return arr[i];
      };
    };
    pluck = function(attr) {
      return function(d) {
        return d[attr];
      };
    };
    equal = function(it) {
      return function(x) {
        return x === it;
      };
    };
    notEqual = function(it) {
      return function(x) {
        return x !== it;
      };
    };
    lessThan = function(it) {
      return function(x) {
        return x < it;
      };
    };
    greaterThan = function(it) {
      return function(x) {
        return x > it;
      };
    };
    lessEqual = function(it) {
      return function(x) {
        return x <= it;
      };
    };
    greaterEqual = function(it) {
      return function(x) {
        return x >= it;
      };
    };
    plus = function(it) {
      return function(x) {
        return x + it;
      };
    };
    minus = function(it) {
      return function(x) {
        return x - it;
      };
    };
    abs = Math.abs;
    floor = Math.floor;
    ceil = Math.ceil;
    precise = function(n) {
      return function(x) {
        return parseFloat(x.toPrecision(n));
      };
    };
    accept_multi_or_array = function(f) {
      return function() {
        var arr;
        arr = 1 <= arguments.length ? slice.call(arguments, 0) : [];
        return f(arr.length === 1 && arr.first instanceof Array ? arr.first : arr);
      };
    };
    sum = accept_multi_or_array(function(arr) {
      var k, len, r, x;
      if (arr.length === 1 && arr.first instanceof Array) {
        arr = arr.first;
      }
      r = 0;
      for (k = 0, len = arr.length; k < len; k++) {
        x = arr[k];
        r += x;
      }
      return r;
    });
    max = accept_multi_or_array(function(arr) {
      return best(function(a, b) {
        return a > b;
      })(arr);
    });
    min = accept_multi_or_array(function(arr) {
      return best(function(a, b) {
        return a < b;
      })(arr);
    });
    max_index = accept_multi_or_array(function(arr) {
      var k, ref, results;
      return best(function(i, j) {
        return arr[i] > arr[j];
      })((function() {
        results = [];
        for (var k = 0, ref = arr.length; 0 <= ref ? k < ref : k > ref; 0 <= ref ? k++ : k--){ results.push(k); }
        return results;
      }).apply(this));
    });
    min_index = accept_multi_or_array(function(arr) {
      var k, ref, results;
      return best(function(i, j) {
        return arr[i] < arr[j];
      })((function() {
        results = [];
        for (var k = 0, ref = arr.length; 0 <= ref ? k < ref : k > ref; 0 <= ref ? k++ : k--){ results.push(k); }
        return results;
      }).apply(this));
    });
    return {
      flip: flip,
      combine: combine,
      curry2: curry2,
      curry3: curry3,
      uncurry2: uncurry2,
      uncurry3: uncurry3,
      pack: pack,
      unpack: unpack,
      seek: seek,
      pluck: pluck,
      equal: equal,
      notEqual: notEqual,
      lessThan: lessThan,
      lessEqual: lessEqual,
      greaterThan: greaterThan,
      greaterEqual: greaterEqual,
      plus: plus,
      minus: minus,
      abs: abs,
      floor: floor,
      ceil: ceil,
      precise: precise,
      sum: sum,
      max: max,
      min: min,
      max_index: max_index,
      min_index: min_index
    };
  };

  module.exports = this_module({
    best: require('lazy-list').best
  });

}).call(this);


},{"lazy-list":11}],4:[function(require,module,exports){
(function() {
  var basics, convertors, funny, lazy, url_helpers, utils;

  utils = require('./utils');

  basics = require('./basics');

  lazy = require('lazy-list');

  funny = require('./funny');

  convertors = require('./convertors');

  url_helpers = require('./url-helpers');

  module.exports = utils.extend({})(utils, basics, lazy, funny, convertors, url_helpers);

}).call(this);


},{"./basics":3,"./convertors":5,"./funny":6,"./url-helpers":8,"./utils":9,"lazy-list":11}],5:[function(require,module,exports){
(function() {
  var this_module;

  this_module = function() {
    var bool, chr, float, hex, int, json, obj, ord, str;
    int = function(s, base) {
      var r;
      if (typeof s === 'string') {
        r = parseInt(s, base);
        if (!((s.slice != null) && r === parseInt(s.slice(0, -1), base))) {
          return r;
        } else {
          return null;
        }
      } else {
        return parseInt(0 + s);
      }
    };
    float = function(s) {
      if (/^-?[0-9]*(\.[0-9]+)?([eE]-?[0-9]+)?$/.test(s)) {
        return parseFloat(s);
      } else {
        return null;
      }
    };
    str = function(x, base) {
      return x.toString(base);
    };
    bool = function(x) {
      if (x === true || x === false) {
        return x;
      } else {
        return null;
      }
    };
    hex = function(x) {
      return x.toString(16);
    };
    ord = function(c) {
      return c.charCodeAt();
    };
    chr = function(x) {
      return String.fromCharCode(x);
    };
    json = function(it, indent) {
      return JSON.stringify(it, null, indent);
    };
    obj = function(s) {
      return JSON.parse(s);
    };
    return {
      int: int,
      float: float,
      bool: bool,
      str: str,
      hex: hex,
      ord: ord,
      chr: chr,
      json: json,
      obj: obj
    };
  };

  module.exports = this_module();

}).call(this);


},{}],6:[function(require,module,exports){
(function() {
  var this_module,
    slice = [].slice;

  this_module = function() {
    var Y, church, fix, memoFix, memoize;
    church = function(n) {
      var iter;
      iter = function(f, n, r) {
        if (n === 0) {
          return r;
        } else {
          return iter(f, n - 1, f(r));
        }
      };
      return function(f) {
        return function(x) {
          return iter(f, n + 0, x);
        };
      };
    };
    Y = function(f) {
      return (function(x) {
        return x(x);
      })((function(x) {
        return f((function(y) {
          return (x(x))(y);
        }));
      }));
    };
    memoize = function(f, get_key) {
      var cache;
      if (get_key == null) {
        get_key = (function() {
          var args;
          args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
          return json(args);
        });
      }
      cache = {};
      return function() {
        var args, cached, key, r;
        args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
        key = get_key.apply(null, args);
        cached = cache[key];
        if (cached != null) {
          return cached;
        } else {
          r = f.apply(null, args);
          cache[key] = r;
          return r;
        }
      };
    };
    fix = Y;
    memoFix = function(ff) {
      var f;
      f = memoize(ff((function() {
        var args;
        args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
        return f.apply(null, args);
      })));
      return f;
    };
    return {
      church: church,
      Y: Y,
      memoize: memoize,
      fix: fix,
      memoFix: memoFix
    };
  };

  module.exports = this_module();

}).call(this);


},{}],7:[function(require,module,exports){
(function (global){
(function() {
  var k, mate, v;

  mate = require('./coffee-mate');

  for (k in mate) {
    v = mate[k];
    global[k] = v;
  }

}).call(this);


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./coffee-mate":4}],8:[function(require,module,exports){
(function() {
  var this_module;

  this_module = function() {
    var uri_decoder, uri_encoder;
    uri_encoder = function(component_packer) {
      if (component_packer == null) {
        component_packer = str;
      }
      return function(obj) {
        var k, v;
        return ((function() {
          var results;
          results = [];
          for (k in obj) {
            v = obj[k];
            results.push((encodeURIComponent(k)) + "=" + (encodeURIComponent(component_packer(v))));
          }
          return results;
        })()).join('&');
      };
    };
    uri_decoder = function(component_unpacker) {
      if (component_unpacker == null) {
        component_unpacker = (function(s) {
          return s;
        });
      }
      return function(str) {
        var d, i, j, k, len, ref, ref1, ref2, s, v;
        d = {};
        ref1 = (ref = str.match(/[^?=&]+=[^&]*/g)) != null ? ref : [];
        for (i = 0, len = ref1.length; i < len; i++) {
          s = ref1[i];
          ref2 = s.match(/([^=]+)=(.*)/), j = ref2.length - 2, k = ref2[j++], v = ref2[j++];
          d[decodeURIComponent(k)] = component_unpacker(decodeURIComponent(v));
        }
        return d;
      };
    };
    return {
      uri_encoder: uri_encoder,
      uri_decoder: uri_decoder
    };
  };

  module.exports = this_module();

}).call(this);


},{}],9:[function(require,module,exports){
(function (process){
(function() {
  var this_module,
    slice = [].slice;

  this_module = function() {
    var assert, assertEq, assertEqOn, copy, deepcopy, dict, extend, function_literal, log, overload, ref, securely, time_now, update;
    function_literal = function(f) {
      var expr;
      expr = f.toString().replace(/^\s*function\s?\(\s?\)\s?{\s*return\s*([^]*?);?\s*}$/, '$1');
      if (expr.length <= 100) {
        expr = expr.replace(/[\r\n]{1,2}\s*/g, '');
      }
      return expr;
    };
    time_now = function() {
      return (new Date).getTime();
    };
    log = (function() {
      var dye, factory, got, histories, log_label;
      dye = (function() {
        var cavailable, palette;
        cavailable = (typeof window === "undefined" || window === null) && (typeof process !== "undefined" && process !== null) && !process.env.NODE_DISABLE_COLORS;
        palette = {
          bold: '\x1B[0;1m',
          red: '\x1B[0;31m',
          green: '\x1B[0;32m',
          yellow: '\x1B[0;33m',
          blue: '\x1B[0;34m',
          bold_grey: '\x1B[1;30m'
        };
        if (!cavailable) {
          return function(color) {
            return function(s) {
              return s;
            };
          };
        } else {
          return function(color) {
            return function(s) {
              return "" + palette[color] + s + '\x1B[0m';
            };
          };
        }
      })();
      log_label = (function() {
        var flag_palette, op_flag;
        flag_palette = {
          '#': 'bold_grey',
          'I': 'green',
          'E': 'red',
          'W': 'yellow'
        };
        op_flag = function(op) {
          if (op === 'log') {
            return '#';
          } else {
            return op[0].toUpperCase();
          }
        };
        return function(op) {
          var flag;
          flag = op_flag(op);
          return dye(flag_palette[flag])(flag);
        };
      })();
      histories = [];
      factory = function(op) {
        var prefix;
        prefix = "" + (dye('bold_grey')('#')) + (log_label(op));
        return function() {
          var args, ball, eval_result, expr, f, i, len, start_time, time_used;
          args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
          ball = [];
          for (i = 0, len = args.length; i < len; i++) {
            f = args[i];
            if (typeof f === 'function') {
              expr = function_literal(f);
              start_time = time_now();
              eval_result = f();
              time_used = time_now() - start_time;
              ball.push(prefix + " " + (dye('green')(expr)) + " " + (dye('bold_grey')('==>')), eval_result);
              if (time_used > 0) {
                ball.push(dye('yellow')("[" + time_used + "ms]"));
              }
            } else {
              ball.push("" + prefix, f);
            }
          }
          console[op].apply(console, ball);
          histories.push(ball);
          if (histories.length >= 10) {
            histories.shift();
          }
          return null;
        };
      };
      got = factory('log');
      got.histories = histories;
      got.info = factory('info');
      got.warn = factory('warn');
      got.error = got.err = factory('error');
      return got;
    })();
    assert = function(f, msg) {
      var e, r, ref;
      if (!(f instanceof Function)) {
        ref = [msg, f], f = ref[0], msg = ref[1];
      }
      try {
        r = f();
      } catch (_error) {
        e = _error;
        throw Error("Assertion " + (msg != null ? msg : function_literal(f)) + " Unknown:\n" + e);
      }
      if (!r) {
        throw Error("Assertion " + (msg != null ? msg : function_literal(f)) + " Failed!");
      }
    };
    assertEq = function(l, r) {
      var e, lv, rv;
      try {
        lv = l();
        rv = r();
      } catch (_error) {
        e = _error;
        throw Error("Equation Between " + (function_literal(l)) + " And " + (function_literal(r)) + " Unknown:\n" + e);
      }
      if (lv !== rv) {
        throw Error("Equation Failed:\n\t" + (function_literal(l)) + " IS " + lv + " BUT\n\t" + (function_literal(r)) + " IS " + rv + ".");
      }
    };
    assertEqOn = function(f) {
      return function(l, r) {
        var e, flv, frv, lv, rv;
        try {
          lv = l();
          rv = r();
          flv = f(lv);
          frv = f(rv);
        } catch (_error) {
          e = _error;
          throw Error("MAPPED Equation Between " + (function_literal(l)) + " And " + (function_literal(r)) + " Unknown:\n" + e);
        }
        if (flv !== frv) {
          throw Error("Equation Failed:\n\t" + (function_literal(l)) + " IS " + lv + " AND MAPPED TO " + flv + " BUT\n\t" + (function_literal(r)) + " IS " + rv + " AND MAPPED TO " + frv + ".");
        }
      };
    };
    securely = function(f) {
      return function() {
        var args;
        args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
        args = deepcopy(args);
        return f.apply(null, args);
      };
    };
    dict = function(pairs) {
      var d, i, k, len, ref, v;
      d = {};
      for (i = 0, len = pairs.length; i < len; i++) {
        ref = pairs[i], k = ref[0], v = ref[1];
        d[k] = v;
      }
      return d;
    };
    ref = (function() {
      var cp;
      cp = function(root, dep) {
        var k, r, v;
        if (dep === 0 || (root == null) || typeof root !== 'object') {
          return root;
        }
        if (root instanceof Array) {
          r = (function() {
            var i, len, results;
            results = [];
            for (i = 0, len = root.length; i < len; i++) {
              v = root[i];
              results.push(cp(v, dep - 1));
            }
            return results;
          })();
        } else {
          r = {};
          for (k in root) {
            v = root[k];
            r[k] = cp(v, dep - 1);
          }
        }
        return r;
      };
      return {
        copy: function(obj, depth) {
          if (depth == null) {
            depth = 1;
          }
          return cp(obj, depth);
        },
        deepcopy: function(obj, depth) {
          if (depth == null) {
            depth = Infinity;
          }
          return cp(obj, depth);
        }
      };
    })(), copy = ref.copy, deepcopy = ref.deepcopy;
    extend = function(base) {
      return function() {
        var d, defaults, i, k, len, v;
        defaults = 1 <= arguments.length ? slice.call(arguments, 0) : [];
        for (i = 0, len = defaults.length; i < len; i++) {
          d = defaults[i];
          if (d != null) {
            for (k in d) {
              v = d[k];
              if (base[k] == null) {
                base[k] = v;
              }
            }
          }
        }
        return base;
      };
    };
    update = function(base) {
      return function() {
        var d, i, k, len, updates, v;
        updates = 1 <= arguments.length ? slice.call(arguments, 0) : [];
        for (i = 0, len = updates.length; i < len; i++) {
          d = updates[i];
          if (d != null) {
            for (k in d) {
              v = d[k];
              base[k] = v;
            }
          }
        }
        return base;
      };
    };
    overload = function(_d) {
      var d, fallback;
      d = copy(_d);
      fallback = d['_'];
      if (fallback != null) {
        return function() {
          var args, ref1;
          args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
          return ((ref1 = d[args.length]) != null ? ref1 : fallback).apply(null, args);
        };
      } else {
        return function() {
          var args, f;
          args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
          f = d[args.length];
          if (f == null) {
            throw Error("This Function Can't Accept " + args.length + " Args");
          } else {
            return f.apply(null, args);
          }
        };
      }
    };
    return {
      log: log,
      assert: assert,
      assertEq: assertEq,
      assertEqOn: assertEqOn,
      dict: dict,
      copy: copy,
      deepcopy: deepcopy,
      securely: securely,
      extend: extend,
      update: update,
      overload: overload
    };
  };

  module.exports = this_module();

}).call(this);


}).call(this,require('_process'))

},{"_process":2}],10:[function(require,module,exports){
require('./build/nodejs/global.js');

},{"./build/nodejs/global.js":7}],11:[function(require,module,exports){
(function() {
  var this_module,
    slice = [].slice;

  this_module = function(arg) {
    var Iterator, LazyList, Symbol, all, any, best, brk, cartProd, concat, cons, drop, dropWhile, enumerate, filter, foldl, foreach, fromList, groupOn, head, iterate, last, lazy, length, list, map, maximum, maximumOn, minimum, minimumOn, naturals, nil, partition, permutations, primes, randoms, range, ref, repeat, reverse, scanl, sort, sortOn, streak, streak2, take, takeWhile, zip, zipWith;
    Symbol = arg.Symbol;
    LazyList = function(f) {
      f[Symbol.iterator] = function() {
        return f();
      };
      f.toString = function() {
        return "LazyList";
      };
      return f;
    };
    nil = LazyList(function() {
      return nil;
    });
    nil.toString = function() {
      return 'nil';
    };
    Iterator = function(it) {
      it.next = function() {
        var r;
        r = it();
        return {
          value: r,
          done: r === nil
        };
      };
      it.toString = function() {
        return "Iterator";
      };
      return it;
    };
    naturals = LazyList(function() {
      var i;
      i = -1;
      return Iterator(function() {
        return ++i;
      });
    });
    range = function() {
      var args;
      args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
      if (args.length === 0) {
        return naturals;
      } else if (args.length === 1) {
        return LazyList(function() {
          var i, stop;
          stop = args[0];
          i = -1;
          return Iterator(function() {
            if (++i < stop) {
              return i;
            } else {
              return nil;
            }
          });
        });
      } else if (args.length === 2) {
        return LazyList(function() {
          var i, start, stop;
          start = args[0], stop = args[1];
          if (start < stop) {
            i = start - 1;
            return Iterator(function() {
              if (++i < stop) {
                return i;
              } else {
                return nil;
              }
            });
          } else {
            i = start + 1;
            return Iterator(function() {
              if (--i > stop) {
                return i;
              } else {
                return nil;
              }
            });
          }
        });
      } else {
        return LazyList(function() {
          var i, start, step, stop;
          start = args[0], stop = args[1], step = args[2];
          if (stop !== start && (stop - start) * step < 0) {
            throw 'ERR IN range(): YOU ARE CREATING AN UNLIMITTED RANGE';
          }
          i = start - step;
          if (start < stop) {
            return Iterator(function() {
              if ((i += step) < stop) {
                return i;
              } else {
                return nil;
              }
            });
          } else {
            return Iterator(function() {
              if ((i += step) > stop) {
                return i;
              } else {
                return nil;
              }
            });
          }
        });
      }
    };
    primes = LazyList(function() {
      return filter(function(x) {
        return all(function(p) {
          return x % p !== 0;
        })(takeWhile(function(p) {
          return p * p <= x;
        })(range(2, Infinity)));
      })(range(2, Infinity))();
    });
    lazy = function(xs) {
      var ref;
      if (typeof xs === 'function') {
        if (xs[Symbol.iterator] != null) {
          return xs;
        } else {
          return LazyList(xs);
        }
      } else if ((ref = xs.constructor) === Array || ref === String) {
        return LazyList(function() {
          var i;
          i = -1;
          return Iterator(function() {
            if ((++i) < xs.length) {
              return xs[i];
            } else {
              return nil;
            }
          });
        });
      } else if (xs[Symbol.iterator] != null) {
        return LazyList(function() {
          var it;
          it = xs[Symbol.iterator]();
          return Iterator(function() {
            var r;
            r = it.next();
            if (r.done) {
              return nil;
            } else {
              return r.value;
            }
          });
        });
      } else {
        throw Error('lazy(xs): xs is neither Array nor Iterable');
      }
    };
    enumerate = function(it) {
      if ((it[Symbol.iterator] != null) || it instanceof Array) {
        return zip(naturals, it);
      } else {
        return LazyList(function() {
          var i, keys;
          keys = Object.keys(it);
          i = -1;
          return Iterator(function() {
            var k;
            if (++i < keys.length) {
              return [(k = keys[i]), it[k]];
            } else {
              return nil;
            }
          });
        });
      }
    };
    repeat = function(x) {
      return LazyList(function() {
        return Iterator(function() {
          return x;
        });
      });
    };
    iterate = function(next, init) {
      return LazyList(function() {
        var st;
        st = init;
        return Iterator(function() {
          var r;
          r = st;
          st = next(st);
          return r;
        });
      });
    };
    randoms = (function() {
      var hash, normal, salt;
      salt = Math.PI / 3.0;
      hash = function(x) {
        x = Math.sin(x + salt) * 1e4;
        return x - Math.floor(x);
      };
      normal = function(seed) {
        return iterate(hash, hash(seed));
      };
      return function(opts) {
        var k, ref, ref1, rg, s, seed;
        if (opts == null) {
          return normal(0);
        } else if (typeof opts === 'number') {
          return normal(opts);
        } else {
          seed = (ref = opts.seed) != null ? ref : 0;
          rg = opts.range;
          if (rg != null) {
            if (typeof rg === 'number') {
              return map(function(x) {
                return Math.floor(x * rg);
              })(normal(seed));
            } else {
              ref1 = [rg[0], rg[1] - rg[0] + 1], s = ref1[0], k = ref1[1];
              return map(function(x) {
                return s + Math.floor(x * k);
              })(normal(seed));
            }
          } else {
            return normal(seed);
          }
        }
      };
    })();
    permutations = (function() {
      var next_permutation;
      next_permutation = function(x) {
        var l, m, r, ref, ref1;
        x = x.slice(0);
        l = x.length - 1;
        while (l >= 1 && x[l] <= x[l - 1]) {
          --l;
        }
        if (l !== 0) {
          m = x.length - 1;
          while (m > l - 1 && x[m] <= x[l - 1]) {
            --m;
          }
          ref = [x[l - 1], x[m]], x[m] = ref[0], x[l - 1] = ref[1];
        }
        r = x.length - 1;
        while (l < r) {
          ref1 = [x[r], x[l]], x[l] = ref1[0], x[r] = ref1[1];
          ++l;
          --r;
        }
        return x;
      };
      return function(xs) {
        var arr;
        arr = list(xs);
        if (arr.length === 0) {
          return nil;
        } else {
          return cons(arr.slice(0))(takeWhile(function(ls) {
            return json(ls) !== json(arr);
          })(drop(1)(iterate(next_permutation, arr))));
        }
      };
    })();
    take = function(n) {
      return function(xs) {
        return LazyList(function() {
          var c, iter;
          iter = lazy(xs)[Symbol.iterator]();
          c = -1;
          return Iterator(function() {
            if (++c < n) {
              return iter();
            } else {
              return nil;
            }
          });
        });
      };
    };
    takeWhile = function(ok) {
      return function(xs) {
        return LazyList(function() {
          var iter;
          iter = lazy(xs)[Symbol.iterator]();
          return Iterator(function() {
            var x;
            if ((x = iter()) !== nil && ok(x)) {
              return x;
            } else {
              return nil;
            }
          });
        });
      };
    };
    drop = function(n) {
      return function(xs) {
        return LazyList(function() {
          var finished, i, iter, j, ref;
          iter = lazy(xs)[Symbol.iterator]();
          finished = false;
          for (i = j = 0, ref = n; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
            finished || (finished = iter() === nil);
            if (finished) {
              break;
            }
          }
          if (finished) {
            return function() {
              return nil;
            };
          } else {
            return iter;
          }
        });
      };
    };
    dropWhile = function(ok) {
      return function(xs) {
        return LazyList(function() {
          var iter, x;
          iter = lazy(xs)[Symbol.iterator]();
          while (ok(x = iter()) && x !== nil) {
            null;
          }
          return Iterator(function() {
            var prevx, ref;
            ref = [x, iter()], prevx = ref[0], x = ref[1];
            return prevx;
          });
        });
      };
    };
    cons = function(x) {
      return function(xs) {
        return LazyList(function() {
          var iter;
          iter = null;
          return Iterator(function() {
            if (iter === null) {
              iter = lazy(xs)[Symbol.iterator]();
              return x;
            } else {
              return iter();
            }
          });
        });
      };
    };
    map = function(f) {
      return function(xs) {
        return LazyList(function() {
          var iter;
          iter = lazy(xs)[Symbol.iterator]();
          return Iterator(function() {
            var x;
            if ((x = iter()) !== nil) {
              return f(x);
            } else {
              return nil;
            }
          });
        });
      };
    };
    filter = function(ok) {
      return function(xs) {
        return LazyList(function() {
          var iter;
          iter = lazy(xs)[Symbol.iterator]();
          return Iterator(function() {
            var x;
            while ((x = iter()) !== nil && !ok(x)) {
              null;
            }
            return x;
          });
        });
      };
    };
    scanl = function(f, r) {
      return function(xs) {
        return LazyList(function() {
          var iter;
          iter = lazy(xs)[Symbol.iterator]();
          return Iterator(function() {
            var got, x;
            got = r;
            r = (x = iter()) !== nil ? f(r, x) : nil;
            return got;
          });
        });
      };
    };
    streak = function(n) {
      if (n < 1) {
        return nil;
      } else {
        return function(xs) {
          return drop(n - 1)(LazyList(function() {
            var buf, iter;
            iter = lazy(xs)[Symbol.iterator]();
            buf = [];
            return Iterator(function() {
              var x;
              if ((x = iter()) === nil) {
                return nil;
              }
              buf.push(x);
              if (buf.length > n) {
                buf.shift(1);
              }
              return buf.slice(0);
            });
          }));
        };
      }
    };
    streak2 = function(n) {
      return function(xs) {
        return streak(n)(concat([xs, take(n - 1)(xs)]));
      };
    };
    reverse = function(xs) {
      var ref;
      if ((ref = xs.constructor) === Array || ref === String) {
        return LazyList(function() {
          var i;
          i = xs.length;
          return Iterator(function() {
            if ((--i) >= 0) {
              return xs[i];
            } else {
              return nil;
            }
          });
        });
      } else {
        return list(lazy(xs)).reverse();
      }
    };
    sort = function(xs) {
      var arr;
      arr = list(lazy(xs));
      return arr.sort(function(a, b) {
        return (a > b) - (a < b);
      });
    };
    sortOn = function(f) {
      return function(xs) {
        var arr;
        arr = list(lazy(xs));
        return arr.sort(function(a, b) {
          var fa, fb;
          return ((fa = f(a)) > (fb = f(b))) - (fa < fb);
        });
      };
    };
    groupOn = function(f) {
      return function(xs) {
        var k, memo, v;
        memo = {};
        foreach(xs, function(x) {
          var y;
          y = f(x);
          if (memo[y] == null) {
            memo[y] = [];
          }
          return memo[y].push(x);
        });
        return (function() {
          var results;
          results = [];
          for (k in memo) {
            v = memo[k];
            results.push(v);
          }
          return results;
        })();
      };
    };
    partition = function(f) {
      return function(xs) {
        var memo;
        memo = [[], []];
        foreach(xs, function(x) {
          var y;
          y = !f(x) + 0;
          return memo[y].push(x);
        });
        return memo;
      };
    };
    concat = function(xss) {
      xss = filter(function(x) {
        var ref;
        return ((ref = x.constructor) !== Array && ref !== String) || x.length > 0;
      })(xss);
      return LazyList(function() {
        var iter, xs, xs_iter;
        xs_iter = lazy(xss)[Symbol.iterator]();
        xs = xs_iter();
        iter = lazy(xs)[Symbol.iterator]();
        return Iterator(function() {
          var x;
          if ((x = iter()) !== nil) {
            return x;
          } else if ((xs = xs_iter()) !== nil) {
            iter = lazy(xs)[Symbol.iterator]();
            return iter();
          } else {
            return nil;
          }
        });
      });
    };
    ref = (function() {
      var finished, zip, zipWith;
      finished = function(arr) {
        var j, len1, x;
        for (j = 0, len1 = arr.length; j < len1; j++) {
          x = arr[j];
          if (x === nil) {
            return true;
          }
        }
        return false;
      };
      zip = function() {
        var xss;
        xss = 1 <= arguments.length ? slice.call(arguments, 0) : [];
        return LazyList(function() {
          var iters, xs;
          iters = (function() {
            var j, len1, results;
            results = [];
            for (j = 0, len1 = xss.length; j < len1; j++) {
              xs = xss[j];
              results.push(lazy(xs)[Symbol.iterator]());
            }
            return results;
          })();
          return Iterator(function() {
            var iter, next;
            next = (function() {
              var j, len1, results;
              results = [];
              for (j = 0, len1 = iters.length; j < len1; j++) {
                iter = iters[j];
                results.push(iter());
              }
              return results;
            })();
            if (finished(next)) {
              return nil;
            } else {
              return next;
            }
          });
        });
      };
      zipWith = function(f) {
        return function() {
          var xss;
          xss = 1 <= arguments.length ? slice.call(arguments, 0) : [];
          return LazyList(function() {
            var iters, xs;
            iters = (function() {
              var j, len1, results;
              results = [];
              for (j = 0, len1 = xss.length; j < len1; j++) {
                xs = xss[j];
                results.push(lazy(xs)[Symbol.iterator]());
              }
              return results;
            })();
            return Iterator(function() {
              var iter, next;
              next = (function() {
                var j, len1, results;
                results = [];
                for (j = 0, len1 = iters.length; j < len1; j++) {
                  iter = iters[j];
                  results.push(iter());
                }
                return results;
              })();
              if (finished(next)) {
                return nil;
              } else {
                return f.apply(null, next);
              }
            });
          });
        };
      };
      return {
        zip: zip,
        zipWith: zipWith
      };
    })(), zip = ref.zip, zipWith = ref.zipWith;
    cartProd = (function() {
      var apply_vector, inc_vector;
      inc_vector = function(limits) {
        var len_minus_1;
        len_minus_1 = limits.length - 1;
        return function(vec) {
          var i;
          i = len_minus_1;
          while (!(++vec[i] < limits[i] || i <= 0)) {
            vec[i--] = 0;
          }
          return vec;
        };
      };
      apply_vector = function(space) {
        var len;
        len = space.length;
        return function(vec) {
          var i, j, ref1, results;
          results = [];
          for (i = j = 0, ref1 = len; 0 <= ref1 ? j < ref1 : j > ref1; i = 0 <= ref1 ? ++j : --j) {
            results.push(space[i][vec[i]]);
          }
          return results;
        };
      };
      return function() {
        var xss;
        xss = 1 <= arguments.length ? slice.call(arguments, 0) : [];
        return LazyList(function() {
          var get_value, i, inc, j, len, len1, limits, v, xs;
          xss = (function() {
            var j, len1, results;
            results = [];
            for (j = 0, len1 = xss.length; j < len1; j++) {
              xs = xss[j];
              results.push(list(xs));
            }
            return results;
          })();
          limits = (function() {
            var j, ref1, results;
            results = [];
            for (i = j = 0, ref1 = xss.length; 0 <= ref1 ? j < ref1 : j > ref1; i = 0 <= ref1 ? ++j : --j) {
              results.push(xss[i].length);
            }
            return results;
          })();
          for (j = 0, len1 = limits.length; j < len1; j++) {
            len = limits[j];
            if (len === 0) {
              return nil;
            }
          }
          inc = inc_vector(limits);
          get_value = apply_vector(xss);
          v = (function() {
            var o, ref1, results;
            results = [];
            for (i = o = 0, ref1 = xss.length; 0 <= ref1 ? o < ref1 : o > ref1; i = 0 <= ref1 ? ++o : --o) {
              results.push(0);
            }
            return results;
          })();
          return Iterator(function() {
            var r;
            if (v[0] < limits[0]) {
              r = get_value(v);
              inc(v);
              return r;
            } else {
              return nil;
            }
          });
        });
      };
    })();
    list = function(xs) {
      var it, n, results, results1, x;
      if (xs instanceof Array) {
        return xs;
      } else if (typeof xs === 'function') {
        it = xs[Symbol.iterator]();
        results = [];
        while ((x = it()) !== nil) {
          results.push(x);
        }
        return results;
      } else if (xs[Symbol.iterator] != null) {
        it = lazy(xs)[Symbol.iterator]();
        results1 = [];
        while ((x = it()) !== nil) {
          results1.push(x);
        }
        return results1;
      } else if (typeof xs === 'number') {
        n = xs;
        return function(xs) {
          return list(take(n)(xs));
        };
      } else {
        throw Error({
          message: 'list(xs): xs is neither Array nor Iterable',
          info: {
            "xs": xs,
            "xs.constructor": xs != null ? xs.constructor : void 0
          }
        });
      }
    };
    head = function(xs) {
      var iter, r, ref1;
      if ((ref1 = xs.constructor) === Array || ref1 === String) {
        if (xs.length > 0) {
          return xs[0];
        } else {
          throw "Error: head() used on empty list.";
        }
      } else {
        iter = lazy(xs)[Symbol.iterator]();
        if ((r = iter()) !== nil) {
          return r;
        } else {
          throw "Error: head() used on empty list.";
        }
      }
    };
    last = function(xs) {
      var iter, r, ref1, ref2, x;
      if ((ref1 = xs.constructor) === Array || ref1 === String) {
        return (ref2 = xs[xs.length - 1]) != null ? ref2 : nil;
      } else {
        iter = lazy(xs)[Symbol.iterator]();
        r = nil;
        while ((x = iter()) !== nil) {
          r = x;
        }
        return r;
      }
    };
    length = function(xs) {
      var iter, r, ref1, x;
      if ((ref1 = xs.constructor) === Array || ref1 === String) {
        return xs.length;
      } else {
        iter = lazy(xs)[Symbol.iterator]();
        r = 0;
        while ((x = iter()) !== nil) {
          ++r;
        }
        return r;
      }
    };
    foldl = function(f, init) {
      return function(xs) {
        var iter, r, x;
        r = init;
        iter = lazy(xs)[Symbol.iterator]();
        while ((x = iter()) !== nil) {
          r = f(r, x);
        }
        return r;
      };
    };
    best = function(better) {
      return function(xs) {
        var it, iter, r;
        iter = lazy(xs)[Symbol.iterator]();
        if ((r = iter()) === nil) {
          return null;
        }
        while ((it = iter()) !== nil) {
          r = better(it, r) ? it : r;
        }
        return r;
      };
    };
    maximumOn = function(f) {
      return best(function(a, b) {
        return f(a) > f(b);
      });
    };
    minimumOn = function(f) {
      return best(function(a, b) {
        return f(a) > f(b);
      });
    };
    maximum = best(function(x, y) {
      return x > y;
    });
    minimum = best(function(x, y) {
      return x < y;
    });
    all = function(f) {
      if (typeof f !== 'function') {
        f = (function(x) {
          return x === f;
        });
      }
      return function(xs) {
        var iter, x;
        iter = lazy(xs)[Symbol.iterator]();
        while ((x = iter()) !== nil) {
          if (!f(x)) {
            return false;
          }
        }
        return true;
      };
    };
    any = function(f) {
      var all_not;
      all_not = all(function(x) {
        return !f(x);
      });
      return function(xs) {
        return !(all_not(xs));
      };
    };
    fromList = function(pairs) {
      var r;
      r = {};
      foreach(pairs, function(arg1) {
        var k, v;
        k = arg1[0], v = arg1[1];
        return r[k] = v;
      });
      return r;
    };
    brk = function() {
      return brk;
    };
    brk.toString = function() {
      return 'foreach.break';
    };
    foreach = function(xs, callback, fruit) {
      var iter, x;
      iter = lazy(xs)[Symbol.iterator]();
      while ((x = iter()) !== nil) {
        if (callback(x, fruit) === brk) {
          break;
        }
      }
      return fruit;
    };
    Object.defineProperties(foreach, {
      "break": {
        writable: false,
        configurable: false,
        enumerable: false,
        value: brk
      }
    });
    return {
      nil: nil,
      LazyList: LazyList,
      Iterator: Iterator,
      Symbol: Symbol,
      naturals: naturals,
      range: range,
      primes: primes,
      lazy: lazy,
      enumerate: enumerate,
      repeat: repeat,
      iterate: iterate,
      randoms: randoms,
      permutations: permutations,
      cons: cons,
      map: map,
      filter: filter,
      take: take,
      takeWhile: takeWhile,
      drop: drop,
      dropWhile: dropWhile,
      scanl: scanl,
      streak: streak,
      streak2: streak2,
      reverse: reverse,
      sort: sort,
      sortOn: sortOn,
      groupOn: groupOn,
      partition: partition,
      concat: concat,
      zip: zip,
      zipWith: zipWith,
      cartProd: cartProd,
      list: list,
      head: head,
      last: last,
      length: length,
      foldl: foldl,
      best: best,
      maximum: maximum,
      minimum: minimum,
      maximumOn: maximumOn,
      minimumOn: minimumOn,
      all: all,
      any: any,
      fromList: fromList,
      foreach: foreach
    };
  };

  module.exports = this_module({
    Symbol: typeof Symbol !== "undefined" && Symbol !== null ? Symbol : {
      iterator: 'iter'
    }
  });

}).call(this);


},{}],12:[function(require,module,exports){
(function (global){
var index, k, v;

index = require('./index');

for (k in index) {
  v = index[k];
  global[k] = v;
}


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./index":14}],13:[function(require,module,exports){
var expandBlockHead, genBlockBody, htmlBlock, htmlInline, ref;

ref = require('./typespec'), htmlInline = ref.htmlInline, htmlBlock = ref.htmlBlock;

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

module.exports = {
  expandBlockHead: expandBlockHead,
  genBlockBody: genBlockBody
};


},{"./typespec":37}],14:[function(require,module,exports){
var Any, Bool, Choose, Enum, Fn, Int, Loose, Map, NamedType, Nat, Optional, Promise, Select, Strict, Tree, TreeMap, UserInfo, UserName, Value, genRenderCode, htmlBlock, htmlInline, instance, match, ref, ref1, ref2, sample, samples, show, showHtml, showPage, typeclass;

require('./prim-object');

require('./prim-array');

require('./prim-constructor');

Bool = require('./prim-bool').Bool;

Any = require('./prim-any').Any;

Int = require('./prim-int').Int;

Nat = require('./prim-nat').Nat;

Enum = require('./prim-enum').Enum;

Value = require('./prim-value').Value;

Optional = require('./prim-optional').Optional;

Promise = require('./prim-promise').Promise;

Tree = require('./prim-tree').Tree;

Map = require('./prim-map').Map;

TreeMap = require('./prim-treemap').TreeMap;

Fn = require('./prim-fn').Fn;

NamedType = require('./prim-namedtype').NamedType;

Strict = require('./prim-strict').Strict;

Loose = require('./prim-loose').Loose;

Select = require('./prim-select').Select;

Choose = require('./prim-choose').Choose;

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


},{"./prim-any":15,"./prim-array":16,"./prim-bool":17,"./prim-choose":18,"./prim-constructor":19,"./prim-enum":20,"./prim-fn":21,"./prim-int":22,"./prim-loose":23,"./prim-map":24,"./prim-namedtype":25,"./prim-nat":26,"./prim-object":27,"./prim-optional":28,"./prim-promise":29,"./prim-select":30,"./prim-strict":31,"./prim-tree":32,"./prim-treemap":33,"./prim-value":34,"./render":35,"./typeclass":36,"./typespec":37,"coffee-mate/global":10}],15:[function(require,module,exports){
var Any, instance;

require('coffee-mate/global');

instance = require('./typeclass').instance;

Any = (function() {
  var r;
  r = function Any(){};
  return (r.constructor = r);
})();

instance('TypeSpec')(Any).where({
  match: function() {
    return function(v) {
      return v != null;
    };
  },
  show: function() {
    return "Any";
  },
  samples: function() {
    return concat(repeat([
      'a', 3, true, [1, 2], {
        x: 1
      }
    ]));
  },
  sample: function() {
    return 'any';
  }
});

module.exports = {
  Any: Any
};


},{"./typeclass":36,"coffee-mate/global":10}],16:[function(require,module,exports){
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


},{"./typeclass":36,"./typespec":37,"coffee-mate/global":10}],17:[function(require,module,exports){
var Bool;

Bool = Boolean;

module.exports = {
  Bool: Bool
};


},{}],18:[function(require,module,exports){
var Choose, genBlockBody, htmlBlock, htmlInline, instance, match, ref, ref1, sample, samples, show, typeclass;

require('coffee-mate/global');

ref = require('./typeclass'), typeclass = ref.typeclass, instance = ref.instance;

ref1 = require('./typespec'), match = ref1.match, show = ref1.show, samples = ref1.samples, sample = ref1.sample, htmlInline = ref1.htmlInline, htmlBlock = ref1.htmlBlock;

genBlockBody = require('./helpers').genBlockBody;

Choose = (function() {
  function Choose(specs) {
    assert(function() {
      return (specs != null) && specs.constructor === Array;
    });
    assert(function() {
      return all(function(x) {
        return (x != null) && typeclass('TypeSpec').hasInstance(x.constructor);
      })(specs);
    });
    return {
      constructor: Choose,
      specs: specs
    };
  }

  return Choose;

})();

instance('TypeSpec')(Choose).where({
  match: function(arg) {
    var specs;
    specs = arg.specs;
    return function(v) {
      return (v != null) && all(match(spec)(v));
    };
  },
  show: function(arg) {
    var specs;
    specs = arg.specs;
    return (list(map(show)(specs))).join(' | ');
  },
  samples: function(arg) {
    var specs;
    specs = arg.specs;
    return concat(repeat(map(sample)(specs)));
  },
  htmlInline: function(arg) {
    var specs;
    specs = arg.specs;
    return "<span class='type-maker unwrapped'>" + ((list(map(htmlInline)(specs))).join(' | ')) + "</span>";
  },
  htmlBlock: function(arg) {
    var specs;
    specs = arg.specs;
    return {
      head: "<span class='type-maker'>Choose [</span>",
      body: genBlockBody('choose', 'meta-field')(dict(list(zip(naturals, specs)))),
      tail: "<span class='type-maker'>]</span>"
    };
  }
});

module.exports = {
  Choose: Choose
};


},{"./helpers":13,"./typeclass":36,"./typespec":37,"coffee-mate/global":10}],19:[function(require,module,exports){
var instance, match, ref, sample, samples, show;

require('coffee-mate/global');

instance = require('./typeclass').instance;

ref = require('./typespec'), match = ref.match, show = ref.show, samples = ref.samples, sample = ref.sample;

instance('TypeSpec')(Function).where({
  match: function(spec) {
    return function(v) {
      return (v != null) && v.constructor === spec;
    };
  },
  show: function(spec) {
    return spec.name || 'UnnamedType';
  },
  samples: function(spec) {
    switch (spec) {
      case Boolean:
        return concat(repeat([true, false]));
      case Number:
        return concat(repeat([3.14, 9, 42]));
      case String:
        return concat(repeat(['abc', 'hello']));
      default:
        return repeat(new spec);
    }
  },
  htmlInline: function(spec) {
    return "<span class='type-maker'>" + (show(spec)) + "</span>";
  }
});


},{"./typeclass":36,"./typespec":37,"coffee-mate/global":10}],20:[function(require,module,exports){
var Enum, instance,
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

require('coffee-mate/global');

instance = require('./typeclass').instance;

Enum = (function() {
  function Enum(ls) {
    assert(function() {
      return all(function(x) {
        return x != null;
      })(ls);
    });
    return {
      constructor: Enum,
      "enum": ls
    };
  }

  return Enum;

})();

instance('TypeSpec')(Enum).where({
  match: function(arg) {
    var vs;
    vs = arg["enum"];
    return function(v) {
      return indexOf.call(vs, v) >= 0;
    };
  },
  show: function(arg) {
    var vs;
    vs = arg["enum"];
    if (vs.length > 1) {
      return "Enum [" + (json(vs[0])) + " ...]";
    } else {
      return "Enum [" + vs[0] + "]";
    }
  },
  samples: function(arg) {
    var vs;
    vs = arg["enum"];
    return concat(repeat(vs));
  },
  htmlInline: function(arg) {
    var vs;
    vs = arg["enum"];
    return "<span class='type-maker unwrapped'>Enum " + (json(vs)) + "</span>";
  }
});

module.exports = {
  Enum: Enum
};


},{"./typeclass":36,"coffee-mate/global":10}],21:[function(require,module,exports){
var Fn, genBlockBody, htmlBlock, htmlInline, instance, match, ref, ref1, sample, samples, show, typeclass;

require('coffee-mate/global');

ref = require('./typeclass'), typeclass = ref.typeclass, instance = ref.instance;

ref1 = require('./typespec'), match = ref1.match, show = ref1.show, samples = ref1.samples, sample = ref1.sample, htmlInline = ref1.htmlInline, htmlBlock = ref1.htmlBlock;

genBlockBody = require('./helpers').genBlockBody;

Fn = (function() {
  function Fn(ispec) {
    assert(function() {
      return typeclass('TypeSpec').hasInstance(ispec.constructor);
    });
    return function(ospec) {
      assert(function() {
        return typeclass('TypeSpec').hasInstance(ospec.constructor);
      });
      return {
        constructor: Fn,
        ispec: ispec,
        ospec: ospec
      };
    };
  }

  return Fn;

})();

instance('TypeSpec')(Fn).where({
  match: function(arg) {
    var ispec, ospec;
    ispec = arg.ispec, ospec = arg.ospec;
    return function(v) {
      return (v != null) && v.constructor === Function;
    };
  },
  withSpec: function(arg) {
    var ispec, ospec;
    ispec = arg.ispec, ospec = arg.ospec;
    return function(v) {
      if (!((v != null) && v.constructor === Function)) {
        throw TypeError({
          expected: 'Function',
          got: v
        });
      } else {
        return function(x) {
          var y;
          withSpec(ispec)(x);
          y = v(x);
          withSpec(ospec)(y);
          return y;
        };
      }
    };
  },
  show: function(arg) {
    var ispec, ospec;
    ispec = arg.ispec, ospec = arg.ospec;
    return (show(ispec)) + " -> " + (show(ospec));
  },
  samples: function(arg) {
    var ispec, ospec;
    ispec = arg.ispec, ospec = arg.ospec;
    return repeat({
      "[input]": sample(ispec),
      "[output]": sample(ospec)
    });
  },
  htmlInline: function(arg) {
    var ispec, ospec;
    ispec = arg.ispec, ospec = arg.ospec;
    return "<span class='type-maker unwrapped'>" + (htmlInline(ispec)) + " -> " + (htmlInline(ospec)) + "</span>";
  },
  htmlBlock: function(arg) {
    var ispec, ospec;
    ispec = arg.ispec, ospec = arg.ospec;
    return {
      head: "<span class='type-maker'>Function (</span>",
      body: genBlockBody('function', 'meta-field')({
        input: ispec,
        output: ospec
      }),
      tail: "<span class='type-maker'>)</span>"
    };
  }
});

module.exports = {
  Fn: Fn
};


},{"./helpers":13,"./typeclass":36,"./typespec":37,"coffee-mate/global":10}],22:[function(require,module,exports){
var Int, instance;

require('coffee-mate/global');

instance = require('./typeclass').instance;

Int = (function() {
  var r;
  r = function Int(){};
  return (r.constructor = r);
})();

instance('TypeSpec')(Int).where({
  match: function() {
    return function(v) {
      return (v != null) && v.constructor === Number && !isNaN(v) && (int(v) != null);
    };
  },
  show: function() {
    return "Int";
  },
  samples: function() {
    return concat(repeat([42, 1, 2]));
  }
});

module.exports = {
  Int: Int
};


},{"./typeclass":36,"coffee-mate/global":10}],23:[function(require,module,exports){
var Loose, genBlockBody, htmlBlock, htmlInline, instance, match, ref, ref1, sample, samples, show, typeclass;

require('coffee-mate/global');

ref = require('./typeclass'), typeclass = ref.typeclass, instance = ref.instance;

ref1 = require('./typespec'), match = ref1.match, show = ref1.show, samples = ref1.samples, sample = ref1.sample, htmlInline = ref1.htmlInline, htmlBlock = ref1.htmlBlock;

genBlockBody = require('./helpers').genBlockBody;

Loose = (function() {
  function Loose(specdict) {
    assert(function() {
      return all(function(arg) {
        var k, spec;
        k = arg[0], spec = arg[1];
        return typeclass('TypeSpec').hasInstance(spec.constructor);
      })(enumerate(specdict));
    });
    return {
      constructor: Loose,
      specdict: specdict
    };
  }

  return Loose;

})();

instance('TypeSpec')(Loose).where({
  match: function(specdict) {
    return function(v) {
      return (v != null) && v.constructor === Object && (all(function(arg) {
        var k, spec;
        k = arg[0], spec = arg[1];
        return match(spec)(v[k]);
      })(enumerate(specdict)));
    };
  },
  show: function(arg) {
    var specdict;
    specdict = arg.specdict;
    return 'Loose {' + (list(map(function(arg1) {
      var k, spec;
      k = arg1[0], spec = arg1[1];
      return k + ": " + (show(spec));
    })(enumerate(specdict)))).join(', ') + '}';
  },
  samples: function(arg) {
    var specdict;
    specdict = arg.specdict;
    return repeat(dict(list(map(function(arg1) {
      var k, v;
      k = arg1[0], v = arg1[1];
      return [k, sample(v)];
    })(enumerate(specdict)))));
  },
  htmlInline: function(arg) {
    var specdict;
    specdict = arg.specdict;
    return "<span class='type-maker unwrapped'>Loose {<span class='folded-detail'>...</span>}</span>";
  },
  htmlBlock: function(arg) {
    var specdict;
    specdict = arg.specdict;
    return {
      head: "<span class='type-maker'>Loose {</span>",
      body: genBlockBody('loose', 'field-name')(specdict),
      tail: "<span class='type-maker'>}</span>"
    };
  }
});

module.exports = {
  Loose: Loose
};


},{"./helpers":13,"./typeclass":36,"./typespec":37,"coffee-mate/global":10}],24:[function(require,module,exports){
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


},{"./helpers":13,"./typeclass":36,"./typespec":37,"coffee-mate/global":10}],25:[function(require,module,exports){
var NamedType, expandBlockHead, htmlBlock, htmlInline, instance, match, ref, ref1, sample, samples, show, typeclass;

require('coffee-mate/global');

ref = require('./typeclass'), typeclass = ref.typeclass, instance = ref.instance;

ref1 = require('./typespec'), match = ref1.match, show = ref1.show, samples = ref1.samples, sample = ref1.sample, htmlInline = ref1.htmlInline, htmlBlock = ref1.htmlBlock;

expandBlockHead = require('./helpers').expandBlockHead;

NamedType = (function() {
  function NamedType(arg) {
    var check, desc, name, samples, spec;
    name = arg.name, spec = arg.spec, desc = arg.desc, check = arg.check, samples = arg.samples;
    if ((name == null) || (spec == null)) {
      throw Error('name & spec must be specified for a NamedType declaration');
    }
    assert(function() {
      return typeclass('TypeSpec').hasInstance(spec.constructor);
    });
    if ((samples != null) && !all(match(spec))(take(100)(samples))) {
      log(function() {
        return name;
      });
      log(function() {
        return spec;
      });
      log(function() {
        return samples;
      });
      log(function() {
        return match(spec)(samples[0]);
      });
      throw TypeError('bad samples');
    }
    return {
      constructor: NamedType,
      name: name,
      spec: spec,
      desc: desc,
      check: check,
      samples: samples
    };
  }

  return NamedType;

})();

instance('TypeSpec')(NamedType).where({
  match: function(arg) {
    var check, spec;
    spec = arg.spec, check = arg.check;
    return function(v) {
      return match(spec)(v) && (check != null ? check(v) : true);
    };
  },
  show: function(arg) {
    var name, spec;
    name = arg.name, spec = arg.spec;
    return name || (show(spec));
  },
  samples: function(arg) {
    var ls, spec;
    spec = arg.spec, ls = arg.samples;
    if (ls != null) {
      return concat(repeat(ls));
    } else {
      return samples(spec);
    }
  },
  htmlInline: function(arg) {
    var name, spec;
    name = arg.name, spec = arg.spec;
    if (name != null) {
      return "<span class='type-name'>" + name + "</span>";
    } else {
      return htmlInline(spec);
    }
  },
  htmlBlock: function(arg) {
    var name, ref2, spec;
    name = arg.name, spec = arg.spec;
    return (ref2 = expandBlockHead(function(head) {
      return "<span><span class='type-name'>" + name + "</span><span class='spliter'>spec:</span>" + head + "</span>";
    })(spec)) != null ? ref2 : {
      head: "<span><span class='type-name'>" + name + "</span><span class='spliter'>spec:</span>" + (htmlInline(spec)) + "</span>"
    };
  },
  showHtml: function(t) {
    var check, checkPart, desc, descriptionPart, name, namePart, samplePart, spec, specPart;
    name = t.name, desc = t.desc, spec = t.spec, check = t.check;
    namePart = name == null ? '' : "<div class='name'>\n<span class='meta-field'>name</span>: <span class='type-name'>" + name + "</span>\n</div>";
    descriptionPart = desc == null ? '' : (function() {
      var s;
      s = desc;
      return "<div class='desc'>\n<span class='meta-field'>desc</span>: " + (/\n/.test(s) ? "<pre class='text'>" + s + "</pre>" : "<span class='text'>" + s + "</span>") + "\n</div>";
    })();
    specPart = (function() {
      var block, ref2, ref3;
      block = htmlBlock(spec);
      return ("<div class='spec'>\n<div class='" + (block != null ? 'fold' : 'inline') + "'><span class='meta-field'>spec</span>: " + (htmlInline(spec)) + "</div>\n" + (block != null ? "<div class='unfold'>\n	<span class='meta-field'>spec</span>: " + block.head + "\n	" + ((ref2 = block.body) != null ? ref2 : '') + "\n	" + ((ref3 = block.tail) != null ? ref3 : '') + "\n</div>" : '') + "\n</div>").replace(/(\t|\n)/g, '');
    })();
    samplePart = (function() {
      var s;
      s = json(sample(t), 4);
      return "<div class='sample'>\n<span class='meta-field'>sample</span>: " + (/\n/.test(s) ? "<pre class='code'>" + s + "</pre>" : "<span class='code'>" + s + "</span>") + "\n</div>";
    })();
    checkPart = check == null ? '' : (function() {
      var s;
      s = check.toString();
      return "<div class='check'>\n<span class='meta-field'>constraint</span>: " + (/\n/.test(s) ? "<pre class='code'>" + s + "</pre>" : "<span class='code'>" + s + "</span>") + "\n</div>";
    })();
    return "<div class='typespec'>" + (namePart + descriptionPart + specPart + samplePart + checkPart) + "</div>";
  }
});

module.exports = {
  NamedType: NamedType
};


},{"./helpers":13,"./typeclass":36,"./typespec":37,"coffee-mate/global":10}],26:[function(require,module,exports){
var Nat, instance;

require('coffee-mate/global');

instance = require('./typeclass').instance;

Nat = (function() {
  var r;
  r = function Nat(){};
  return (r.constructor = r);
})();

instance('TypeSpec')(Nat).where({
  match: function() {
    return function(v) {
      return (v != null) && v.constructor === Number && !isNaN(v) && v >= 0 && (int(v) != null);
    };
  },
  show: function() {
    return "Nat";
  },
  samples: function() {
    return concat(repeat([42, 1, 2]));
  }
});

module.exports = {
  Nat: Nat
};


},{"./typeclass":36,"coffee-mate/global":10}],27:[function(require,module,exports){
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


},{"./helpers":13,"./typeclass":36,"./typespec":37,"coffee-mate/global":10}],28:[function(require,module,exports){
var Optional, expandBlockHead, htmlBlock, htmlInline, instance, match, ref, ref1, sample, samples, show, typeclass;

require('coffee-mate/global');

ref = require('./typeclass'), typeclass = ref.typeclass, instance = ref.instance;

ref1 = require('./typespec'), match = ref1.match, show = ref1.show, samples = ref1.samples, sample = ref1.sample, htmlInline = ref1.htmlInline, htmlBlock = ref1.htmlBlock;

expandBlockHead = require('./helpers').expandBlockHead;

Optional = (function() {
  function Optional(spec) {
    assert(function() {
      return typeclass('TypeSpec').hasInstance(spec.constructor);
    });
    return {
      constructor: Optional,
      spec: spec
    };
  }

  return Optional;

})();

instance('TypeSpec')(Optional).where({
  match: function(arg) {
    var spec;
    spec = arg.spec;
    return function(v) {
      return (v == null) || match(spec)(v);
    };
  },
  show: function(arg) {
    var spec;
    spec = arg.spec;
    return "Optional " + (show(spec));
  },
  samples: function(arg) {
    var ls, spec;
    spec = arg.spec;
    ls = list(take(2)(samples(spec)));
    return concat(repeat([ls[0], null, ls[1], void 0]));
  },
  htmlInline: function(arg) {
    var spec;
    spec = arg.spec;
    return "<span class='type-maker unwrapped'>Optional " + (htmlInline(spec)) + "</span>";
  },
  htmlBlock: function(arg) {
    var spec;
    spec = arg.spec;
    return expandBlockHead(function(head) {
      return "<span class='type-maker'>Optional " + head + "</span>";
    })(spec);
  }
});

module.exports = {
  Optional: Optional
};


},{"./helpers":13,"./typeclass":36,"./typespec":37,"coffee-mate/global":10}],29:[function(require,module,exports){
var Promise, expandBlockHead, htmlBlock, htmlInline, instance, match, ref, ref1, sample, samples, show, typeclass;

require('coffee-mate/global');

ref = require('./typeclass'), typeclass = ref.typeclass, instance = ref.instance;

ref1 = require('./typespec'), match = ref1.match, show = ref1.show, samples = ref1.samples, sample = ref1.sample, htmlInline = ref1.htmlInline, htmlBlock = ref1.htmlBlock;

expandBlockHead = require('./helpers').expandBlockHead;

Promise = (function() {
  function Promise(spec) {
    assert(function() {
      return typeclass('TypeSpec').hasInstance(spec.constructor);
    });
    return {
      constructor: Promise,
      spec: spec
    };
  }

  return Promise;

})();

instance('TypeSpec')(Promise).where({
  match: function(arg) {
    var spec;
    spec = arg.spec;
    return function(v) {
      return (v != null ? v.then : void 0) != null;
    };
  },
  withSpec: function(arg) {
    var spec;
    spec = arg.spec;
    return function(v) {
      if ((v != null ? v.then : void 0) == null) {
        throw TypeError({
          expected: 'Promise',
          got: v
        });
      } else {
        return v.then(function(x) {
          withSpec(spec)(x);
          return x;
        });
      }
    };
  },
  show: function(arg) {
    var spec;
    spec = arg.spec;
    return "Promise " + (show(spec));
  },
  samples: function(arg) {
    var spec;
    spec = arg.spec;
    return samples(spec);
  },
  htmlInline: function(arg) {
    var spec;
    spec = arg.spec;
    return "<span class='type-maker unwrapped'>Promise " + (htmlInline(spec)) + "</span>";
  },
  htmlBlock: function(arg) {
    var spec;
    spec = arg.spec;
    return expandBlockHead(function(head) {
      return "<span class='type-maker'>Promise " + head + "</span>";
    })(spec);
  }
});

module.exports = {
  Promise: Promise
};


},{"./helpers":13,"./typeclass":36,"./typespec":37,"coffee-mate/global":10}],30:[function(require,module,exports){
var Select, genBlockBody, htmlBlock, htmlInline, instance, match, ref, ref1, sample, samples, show, typeclass;

require('coffee-mate/global');

ref = require('./typeclass'), typeclass = ref.typeclass, instance = ref.instance;

ref1 = require('./typespec'), match = ref1.match, show = ref1.show, samples = ref1.samples, sample = ref1.sample, htmlInline = ref1.htmlInline, htmlBlock = ref1.htmlBlock;

genBlockBody = require('./helpers').genBlockBody;

Select = (function() {
  function Select(specs) {
    assert(function() {
      return all(function(arg) {
        var k, spec;
        k = arg[0], spec = arg[1];
        return typeclass('TypeSpec').hasInstance(spec.constructor);
      })(enumerate(specs));
    });
    return {
      constructor: Select,
      specs: specs
    };
  }

  return Select;

})();

instance('TypeSpec')(Select).where({
  match: function(arg) {
    var specs;
    specs = arg.specs;
    return function(v) {
      var ks, spec;
      return (v != null) && v.constructor === Object && (ks = Object.keys(v)).length === 1 && ((spec = specs[ks[0]]) != null) && (match(spec)(v));
    };
  },
  show: function(arg) {
    var specs;
    specs = arg.specs;
    return 'Select {' + (list(map(function(arg1) {
      var k, spec;
      k = arg1[0], spec = arg1[1];
      return k + ": " + (show(spec));
    })(enumerate(specs)))).join(', ') + '}';
  },
  samples: function(arg) {
    var specs;
    specs = arg.specs;
    return concat(repeat(map(function(arg1) {
      var k, v;
      k = arg1[0], v = arg1[1];
      return dict([[k, sample(v)]]);
    })(enumerate(specs))));
  },
  htmlInline: function(arg) {
    var specdict;
    specdict = arg.specs;
    return "<span class='type-maker unwrapped'>Select {<span class='folded-detail'>...</span>}</span>";
  },
  htmlBlock: function(arg) {
    var specdict;
    specdict = arg.specs;
    return {
      head: "<span class='type-maker'>Select {</span>",
      body: genBlockBody('select', 'field-name')(specdict),
      tail: "<span class='type-maker'>}</span>"
    };
  }
});

module.exports = {
  Select: Select
};


},{"./helpers":13,"./typeclass":36,"./typespec":37,"coffee-mate/global":10}],31:[function(require,module,exports){
var Strict, genBlockBody, htmlBlock, htmlInline, instance, match, ref, ref1, sample, samples, show, typeclass;

require('coffee-mate/global');

ref = require('./typeclass'), typeclass = ref.typeclass, instance = ref.instance;

ref1 = require('./typespec'), match = ref1.match, show = ref1.show, samples = ref1.samples, sample = ref1.sample, htmlInline = ref1.htmlInline, htmlBlock = ref1.htmlBlock;

genBlockBody = require('./helpers').genBlockBody;

Strict = (function() {
  function Strict(specdict) {
    assert(function() {
      return all(function(arg) {
        var k, spec;
        k = arg[0], spec = arg[1];
        return typeclass('TypeSpec').hasInstance(spec.constructor);
      })(enumerate(specdict));
    });
    return {
      constructor: Strict,
      specdict: specdict
    };
  }

  return Strict;

})();

instance('TypeSpec')(Strict).where({
  match: function(arg) {
    var specdict;
    specdict = arg.specdict;
    return function(v) {
      return (v != null) && v.constructor === Object && (all(function(k) {
        return specdict[k] != null;
      })(Object.keys(v))) && all(function(arg1) {
        var k, spec;
        k = arg1[0], spec = arg1[1];
        return match(spec)(v[k]);
      })(enumerate(specdict));
    };
  },
  show: function(arg) {
    var specdict;
    specdict = arg.specdict;
    return '{' + (list(map(function(arg1) {
      var k, spec;
      k = arg1[0], spec = arg1[1];
      return k + ": " + (show(spec));
    })(enumerate(specdict)))).join(', ') + '}';
  },
  samples: function(arg) {
    var specdict;
    specdict = arg.specdict;
    return repeat(dict(list(map(function(arg1) {
      var k, v;
      k = arg1[0], v = arg1[1];
      return [k, sample(v)];
    })(enumerate(specdict)))));
  },
  htmlInline: function(arg) {
    var specdict;
    specdict = arg.specdict;
    return "<span class='type-maker'>{<span class='folded-detail'>...</span>}</span>";
  },
  htmlBlock: function(arg) {
    var specdict;
    specdict = arg.specdict;
    return {
      head: "<span class='type-maker'>{</span>",
      body: genBlockBody('strict', 'field-name')(specdict),
      tail: "<span class='type-maker'>}</span>"
    };
  }
});

module.exports = {
  Strict: Strict
};


},{"./helpers":13,"./typeclass":36,"./typespec":37,"coffee-mate/global":10}],32:[function(require,module,exports){
var Tree, expandBlockHead, htmlBlock, htmlInline, instance, match, ref, ref1, sample, samples, show, typeclass;

require('coffee-mate/global');

ref = require('./typeclass'), typeclass = ref.typeclass, instance = ref.instance;

ref1 = require('./typespec'), match = ref1.match, show = ref1.show, samples = ref1.samples, sample = ref1.sample, htmlInline = ref1.htmlInline, htmlBlock = ref1.htmlBlock;

expandBlockHead = require('./helpers').expandBlockHead;

Tree = (function() {
  function Tree(labelSpec) {
    assert(function() {
      return typeclass('TypeSpec').hasInstance(labelSpec.constructor);
    });
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
      var labelSpec, ml;
      labelSpec = t.labelSpec;
      ml = match(labelSpec);
      return (v != null) && typeof v === 'object' && ml(v.rootLabel) && all(ml)(map(pluck('rootLabel'))(v.subForest));
    };
  },
  show: function(arg) {
    var labelSpec;
    labelSpec = arg.labelSpec;
    return "Tree " + (show(labelSpec));
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


},{"./helpers":13,"./typeclass":36,"./typespec":37,"coffee-mate/global":10}],33:[function(require,module,exports){
var TreeMap, genBlockBody, htmlBlock, htmlInline, instance, match, ref, ref1, sample, samples, show, typeclass;

require('coffee-mate/global');

ref = require('./typeclass'), typeclass = ref.typeclass, instance = ref.instance;

ref1 = require('./typespec'), match = ref1.match, show = ref1.show, samples = ref1.samples, sample = ref1.sample, htmlInline = ref1.htmlInline, htmlBlock = ref1.htmlBlock;

genBlockBody = require('./helpers').genBlockBody;

TreeMap = (function() {
  function TreeMap(kspec) {
    assert(function() {
      return typeclass('TypeSpec').hasInstance(kspec.constructor);
    });
    return function(vspec) {
      assert(function() {
        return typeclass('TypeSpec').hasInstance(vspec.constructor);
      });
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
    return "TreeMap " + (show(kspec)) + " " + (show(vspec));
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


},{"./helpers":13,"./typeclass":36,"./typespec":37,"coffee-mate/global":10}],34:[function(require,module,exports){
var Value, instance;

require('coffee-mate/global');

instance = require('./typeclass').instance;

Value = (function() {
  function Value(v) {
    assert(function() {
      return v != null;
    });
    return {
      constructor: Value,
      value: v
    };
  }

  return Value;

})();

instance('TypeSpec')(Value).where({
  match: function(arg) {
    var value;
    value = arg.value;
    return function(v) {
      return v === value;
    };
  },
  show: function(arg) {
    var value;
    value = arg.value;
    return "Value " + (json(value));
  },
  samples: function(arg) {
    var value;
    value = arg.value;
    return repeat(value);
  },
  htmlInline: function(arg) {
    var value;
    value = arg.value;
    return "<span class='type-maker unwrapped'>Value " + (json(value)) + "</span>";
  }
});

module.exports = {
  Value: Value
};


},{"./typeclass":36,"coffee-mate/global":10}],35:[function(require,module,exports){
var Any, Bool, Choose, Comparator, ConditionExpr, Context, DimensionFilter, DimensionName, Enum, ExclusionCondition, FieldName, Fn, FooSpec, InclusionCondition, Int, Loose, Map, Measure, MeasureName, MemberName, NamedType, Nat, Number, Optional, Promise, Select, SortCondition, Strict, String, TableName, Tree, TreeMap, Value, ValueExpr, WideTable, bind, entries, fs, genRenderCode, htmlBlock, htmlInline, init, match, ref, ref1, sample, samples, show, showHtml, showPage, style;

ref = require('./typespec'), match = ref.match, show = ref.show, sample = ref.sample, samples = ref.samples, showHtml = ref.showHtml, htmlInline = ref.htmlInline, htmlBlock = ref.htmlBlock;

style = ".typespec {\n	font-family: monospace;\n	font-size: 16px;\n	border-width: 4px;\n	border-color: rgba(165, 230, 229, 0.24);\n	border-style: ridge;\n}\n.typespec>div, .typespec>pre {\n	margin: 0.6em\n}\n.typespec .unfolded>.fold, .typespec .folded>.unfold {\n	display: none\n}\n.typespec ul {\n	list-style-type: none;\n	padding: 0px;\n	margin: 0px 0px 0px 2em;\n}\n.typespec .meta-field {\n	color: gray;\n}\n.typespec .field-name {\n	font-weight: bold;\n	color: #87BFB8\n}\n.typespec .type-name {\n	color: blue;\n}\n.typespec .spec .type-name {\n	cursor: pointer\n}\n.typespec .type-maker {\n	color: #223497\n}\n.typespec .type-maker.unwrapped>.unwrapped:before {\n	content: '('\n}\n.typespec .type-maker.unwrapped>.unwrapped:after {\n	content: ')'\n}\n.typespec .spliter {\n	color: gray;\n	padding: 0 0.5em\n}\n.typespec .sample pre {\n	margin: 0;\n	color: green;\n	max-height: 20em;\n	overflow: auto;\n}\n.typespec .spec {\n	cursor: default\n}\n.typespec .spec li:hover {\n	transition: 1s;\n	background-color: rgba(140, 150, 255, 0.12)\n}\n.typespec .spec .type-name:hover, .typespec .spec .folded-detail:hover, .typespec .fold>.field-name:hover, .typespec .unfold>.field-name:hover, .typespec .fold>.meta-field:hover, .typespec .unfold>.meta-field:hover {\n	opacity: 0.6\n}";

bind = function($) {
  return function(rootSelection) {
    rootSelection.find('.unfold').each(function(i, elm) {
      return $(elm).closest('li,.spec').addClass('unfolded').removeClass('folded');
    });
    rootSelection.find('.type-name, .choose').each(function(i, elm) {
      return $(elm).closest('li').addClass('folded').removeClass('unfolded');
    });
    return rootSelection.find('.type-name, .folded-detail, .fold>.field-name, .unfold>.field-name, .fold>.meta-field, .unfold>.meta-field').each(function(i, elm) {
      var e;
      if ((e = $(elm).closest('li,.spec')).length > 0) {
        return $(elm).css({
          cursor: 'pointer'
        }).click(function() {
          return e.toggleClass('folded').toggleClass('unfolded');
        });
      }
    });
  };
};

showPage = function(t) {
  return "<meta http-equiv='Content-Type' content='text/html; charset=utf-8' />\n<style>" + style + "</style>\n" + (showHtml(t)) + "\n<script src='http://libs.baidu.com/jquery/1.9.0/jquery.js'></script>\n<script>(" + (bind.toString()) + ")(jQuery)($('.typespec'))</script>";
};

init = function($) {
  return function(bind, specs, style) {
    $('head').append("<style>" + style + "</style>");
    $('.typespec-hook').each(function(i, elm) {
      return $(elm).append(specs[$(elm).attr('it')]);
    });
    return bind($('.typespec'));
  };
};

genRenderCode = function(entries) {
  var specs;
  specs = json(dict(list(map(function(arg) {
    var k, v;
    k = arg[0], v = arg[1];
    return [k, showHtml(v)];
  })(enumerate(entries)))));
  return "(" + (init.toString()) + ")(jQuery)((" + bind + ")(jQuery), " + specs + ", " + (json(style)) + ")";
};

module.exports = {
  showPage: showPage,
  genRenderCode: genRenderCode
};

if (module.parent === null) {
  require('coffee-mate/global');
  ref1 = require('./index'), Number = ref1.Number, String = ref1.String, Bool = ref1.Bool, Any = ref1.Any, Int = ref1.Int, Nat = ref1.Nat, Enum = ref1.Enum, Value = ref1.Value, Optional = ref1.Optional, Promise = ref1.Promise, Tree = ref1.Tree, Map = ref1.Map, TreeMap = ref1.TreeMap, Fn = ref1.Fn, NamedType = ref1.NamedType, Strict = ref1.Strict, Loose = ref1.Loose, Select = ref1.Select, Choose = ref1.Choose, match = ref1.match, show = ref1.show, sample = ref1.sample, samples = ref1.samples, showHtml = ref1.showHtml, genRenderCode = ref1.genRenderCode, showPage = ref1.showPage;
  TableName = NamedType({
    name: 'TableName',
    spec: String,
    samples: ['table1', 'table2']
  });
  FieldName = NamedType({
    name: 'FieldName',
    spec: String,
    samples: ['product_id', 'sale', 'amount']
  });
  Comparator = Enum(['=', '<', '<=', '>=', '>']);
  WideTable = [
    {
      tableName: TableName,
      join: {
        leftTableName: TableName,
        left: FieldName,
        op: Comparator,
        right: FieldName
      }
    }
  ];
  DimensionName = NamedType({
    name: 'DimensionName',
    spec: String,
    samples: ['date', 'product_type', 'city']
  });
  MeasureName = NamedType({
    name: 'MeasureName',
    spec: String,
    samples: ['sale', 'profit', 'amount']
  });
  Measure = NamedType({
    name: 'Measure',
    spec: Strict({
      name: MeasureName,
      aggregator: Enum(['sum', 'avg', 'max', 'min'])
    })
  });
  MemberName = NamedType({
    name: 'MemberName',
    spec: String,
    samples: ['2013', '2014', '2015']
  });
  ValueExpr = NamedType({
    name: 'ValueExpr',
    spec: String,
    samples: ['sum(sale)']
  });
  ConditionExpr = NamedType({
    name: 'ConditionExpr',
    spec: String,
    samples: ['sum(sale) > 100']
  });
  DimensionFilter = NamedType({
    name: 'DimensionFilter',
    spec: Strict({
      select: [MemberName],
      match: Select({
        contains: String,
        startWith: String,
        endWith: String
      }),
      condition: Select({
        limit: Strict({
          measure: Measure,
          comparator: Comparator,
          value: Number
        }),
        expr: ConditionExpr
      }),
      top: Strict({
        count: Number,
        by: Select({
          measure: Measure,
          expr: ValueExpr
        })
      })
    })
  });
  InclusionCondition = NamedType({
    name: 'InclusionCondition',
    spec: Strict({
      via: [DimensionName],
      positions: [[MemberName]]
    })
  });
  ExclusionCondition = NamedType({
    name: 'ExclusionCondition',
    spec: Strict({
      via: [DimensionName],
      positions: [[MemberName]]
    })
  });
  SortCondition = NamedType({
    name: 'SortCondition',
    spec: Strict({
      asc: Bool,
      by: Select({
        measure: Measure,
        expr: ValueExpr
      }),
      where: Optional(ConditionExpr)
    })
  });
  Context = {
    filter: Strict({
      dimensions: Map(DimensionName)(DimensionFilter),
      measures: [
        Strict({
          measure: Measure,
          limit: {
            minBound: Optional(Number),
            maxBound: Optional(Number)
          }
        })
      ],
      inclusions: [InclusionCondition],
      exclusions: [ExclusionCondition]
    }),
    sort: Map(DimensionName)(SortCondition)
  };
  log(function() {
    return json(sample(WideTable), 4);
  });
  log(function() {
    return show(Context);
  });
  FooSpec = NamedType({
    name: 'FooSpec',
    spec: Fn(Number)(Fn({
      x: Number,
      y: Number
    })(Promise({
      x: String,
      y: Choose([Nat, String, Value('unavailable')])
    }))),
    desc: "hello",
    check: function(x) {
      return x > 1;
    }
  });
  fs = require('fs');
  fs.writeFileSync('test.html', showPage(WideTable));
  entries = {
    a: FooSpec,
    b: WideTable,
    c: Context,
    d: FieldName,
    e: Select({
      x: Number,
      y: String
    }),
    f: Fn(Tree(Int))(Loose({
      x: Number,
      y: Number
    }))
  };
  fs.writeFileSync('test2.js', genRenderCode(entries));
}


},{"./index":14,"./typespec":37,"coffee-mate/global":10,"fs":1}],36:[function(require,module,exports){
var instance, ref, show, typeclass;

require('coffee-mate/global');

ref = (function() {
  var instance, instances, reg, typeclass;
  instances = {};
  reg = {};
  typeclass = function(classname) {
    var cls, ins;
    cls = reg[classname] != null ? reg[classname] : reg[classname] = {};
    ins = instances[classname] != null ? instances[classname] : instances[classname] = [];
    return {
      hasInstance: function(t) {
        return ins.indexOf(t) >= 0;
      },
      where: function(funcs) {
        var rst_funcs;
        rst_funcs = {};
        foreach(enumerate(funcs), function(arg1) {
          var f, funcdefault, funcname, ls;
          funcname = arg1[0], funcdefault = arg1[1];
          ls = cls[funcname] != null ? cls[funcname] : cls[funcname] = [];
          f = function(arg) {
            var funcbody, i, len, ref, type;
            for (i = 0, len = ls.length; i < len; i++) {
              ref = ls[i], type = ref[0], funcbody = ref[1];
              if (arg.constructor === type) {
                return funcbody(arg);
              }
            }
            if (funcdefault != null) {
              return funcdefault.call(rst_funcs, arg);
            } else {
              throw TypeError("no instance of " + classname + "(via " + funcname + "(" + arg + ")) for " + (arg.constructor.name || 'UnnamedType'));
            }
          };
          return rst_funcs[funcname] = f;
        });
        return rst_funcs;
      }
    };
  };
  instance = function(classname) {
    var cls, ins;
    cls = reg[classname] != null ? reg[classname] : reg[classname] = {};
    ins = instances[classname] != null ? instances[classname] : instances[classname] = [];
    return function(type) {
      if (ins.indexOf(type) < 0) {
        ins.push(type);
      }
      return {
        where: function(funcdict) {
          return foreach(enumerate(funcdict), function(arg1) {
            var funcbody, funcname;
            funcname = arg1[0], funcbody = arg1[1];
            return (cls[funcname] != null ? cls[funcname] : cls[funcname] = []).push([type, funcbody]);
          });
        }
      };
    };
  };
  return {
    typeclass: typeclass,
    instance: instance
  };
})(), typeclass = ref.typeclass, instance = ref.instance;

module.exports = {
  typeclass: typeclass,
  instance: instance
};

if (module.parent === null) {
  show = typeclass('Show').where({
    show: function() {
      return str(this.zero());
    },
    zero: function() {
      return 0;
    }
  }).show;
  instance('Show')(String).where({
    show: function(s) {
      return json(s);
    }
  });
  instance('Show')(Number).where({});
  log(function() {
    return show("hello");
  });
  log(function() {
    return show(1);
  });
  log(function() {
    return typeclass('Show').hasInstance(String);
  });
  log(function() {
    return typeclass('Show').hasInstance(Number);
  });
  log(function() {
    return typeclass('Show').hasInstance(Object);
  });
}


},{"coffee-mate/global":10}],37:[function(require,module,exports){
var TypeSpec, typeclass;

require('coffee-mate/global');

typeclass = require('./typeclass').typeclass;

TypeSpec = typeclass('TypeSpec').where({
  match: null,
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

module.exports = TypeSpec;


},{"./typeclass":36,"coffee-mate/global":10}]},{},[12])(12)
});


//# sourceMappingURL=global.js.map