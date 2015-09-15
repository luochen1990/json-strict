(function() {
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
              if (arg == null) {
                throw TypeError("No Instance of " + classname + "(via " + funcname + "(" + arg + ")) For " + arg);
              }
              for (i = 0, len = ls.length; i < len; i++) {
                ref = ls[i], type = ref[0], funcbody = ref[1];
                if (arg.constructor === type) {
                  return funcbody(arg);
                }
              }
              if (funcdefault != null) {
                return funcdefault.call(rst_funcs, arg);
              } else {
                throw TypeError("No Instance of " + classname + "(via " + funcname + "(" + arg + ")) For " + (arg.constructor.name || 'UnnamedType'));
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
      show: function(x) {
        return str(this.zero(x));
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

}).call(this);

//# sourceMappingURL=typeclass.js.map