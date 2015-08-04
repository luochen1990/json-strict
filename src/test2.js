(function ($) {
    return function(bind, specs, style) {
      $('head').append("<style>" + style + "</style>");
      $('.typespec-hook').each(function(i, elm) {
        return $(elm).append(specs[$(elm).attr('it')]);
      });
      return bind($('.typespec'));
    };
  })(jQuery)((function ($) {
    return function(rootSelection) {
      rootSelection.find('ul').each(function(i, elm) {
        return $(elm).closest('li,.spec').addClass('unfolded').removeClass('folded');
      });
      rootSelection.find('.type-name').each(function(i, elm) {
        $(elm).closest('li,.spec').addClass('folded').removeClass('unfolded');
        return $(elm).click(function() {
          return $(elm).closest('li,.spec').toggleClass('folded').toggleClass('unfolded');
        });
      });
      return rootSelection.find('li').each(function(i, elm) {
        $(elm).children('.unfold').children('.field-name').click(function() {
          return $(elm).addClass('folded').removeClass('unfolded');
        });
        return $(elm).children('.fold').children('.field-name').click(function() {
          return $(elm).addClass('unfolded').removeClass('folded');
        });
      });
    };
  })(jQuery), {"a":"<div class='typespec'><div class='spec'><div class='fold'><span class='spliter'>spec:</span><span class='type-name'>TableName</span></div><div class='unfold'><span class='spliter'>spec:</span><span><span class='type-name'>TableName</span><span class='spliter'>spec:</span><span class='type-maker'>String</span></span></div></div>\n<div class='sample'>\n<span class='spliter'>sample:</span><span>\"table1\"</span></div></div>","b":"<div class='typespec'><div class='spec'><div class='fold'><span class='spliter'>spec:</span><span class='type-maker'>[<span>{...}</span>]</span></div><div class='unfold'><span class='spliter'>spec:</span><span class='type-maker'>[<span class='type-maker'>{</span></span><ul><li><div class='fold'><span class='field-name'>tableName</span>: <span class='type-name'>TableName</span></div><div class='unfold'><span class='field-name'>tableName</span>: <span><span class='type-name'>TableName</span><span class='spliter'>spec:</span><span class='type-maker'>String</span></span></div></li><li><div class='fold'><span class='field-name'>join</span>: <span>{...}</span></div><div class='unfold'><span class='field-name'>join</span>: <span class='type-maker'>{</span><ul><li><div class='fold'><span class='field-name'>leftTableName</span>: <span class='type-name'>TableName</span></div><div class='unfold'><span class='field-name'>leftTableName</span>: <span><span class='type-name'>TableName</span><span class='spliter'>spec:</span><span class='type-maker'>String</span></span></div></li><li><span class='field-name'>left</span>: <span class='type-maker'>String</span></li><li><span class='field-name'>right</span>: <span class='type-maker'>String</span></li><li><div class='fold'><span class='field-name'>test</span>: <span class='type-maker'>Maybe <span>{...}</span></span></div><div class='unfold'><span class='field-name'>test</span>: <span class='type-maker'>Maybe <span class='type-maker'>{</span></span><ul><li><span class='field-name'>x</span>: <span class='type-maker'>Number</span></li><li><span class='field-name'>y</span>: <span class='type-maker'>Number</span></li></ul><span class='type-maker'>}</span></div></li><li><div class='fold'><span class='field-name'>expr</span>: <span class='type-name'>Expr</span></div><div class='unfold'><span class='field-name'>expr</span>: <span><span class='type-name'>Expr</span><span class='spliter'>spec:</span><span class='type-maker'>Maybe <span class='type-maker'>{</span></span></span><ul><li><span class='field-name'>left</span>: <span class='type-maker'>String</span></li><li><span class='field-name'>op</span>: <span class='type-maker'>String</span></li><li><span class='field-name'>right</span>: <span class='type-maker'>String</span></li></ul><span class='type-maker'>}</span></div></li></ul><span class='type-maker'>}</span></div></li></ul><span class='type-maker'><span class='type-maker'>}</span>]</span></div></div>\n<div class='sample'>\n<span class='spliter'>sample:</span><pre>[\n    {\n        \"tableName\": \"table1\",\n        \"join\": {\n            \"leftTableName\": \"table1\",\n            \"left\": \"abc\",\n            \"right\": \"abc\",\n            \"test\": null,\n            \"expr\": null\n        }\n    }\n]</pre></div></div>","c":"<div class='typespec'><div class='spec'><div class='fold'><span class='spliter'>spec:</span><span class='type-name'>Expr</span></div><div class='unfold'><span class='spliter'>spec:</span><span><span class='type-name'>Expr</span><span class='spliter'>spec:</span><span class='type-maker'>Maybe <span class='type-maker'>{</span></span></span><ul><li><span class='field-name'>left</span>: <span class='type-maker'>String</span></li><li><span class='field-name'>op</span>: <span class='type-maker'>String</span></li><li><span class='field-name'>right</span>: <span class='type-maker'>String</span></li></ul><span class='type-maker'>}</span></div></div>\n<div class='sample'>\n<span class='spliter'>sample:</span><span>null</span></div></div>"}, ".typespec {\n\tfont-family: monospace;\n\tfont-size: 16px;\n\tborder-width: 4px;\n\tborder-color: rgba(165, 230, 229, 0.24);\n\tborder-style: ridge;\n}\n.typespec>div, .typespec>pre {\n\tmargin: 0.6em\n}\n.typespec .unfolded>.fold, .typespec .folded>.unfold {\n\tdisplay: none\n}\n.typespec ul {\n\tlist-style-type: none;\n\tpadding: 0px;\n\tmargin: 0px 0px 0px 2em;\n}\n.typespec .field-name {\n\tfont-weight: bold;\n\tcolor: #87BFB8\n}\n.typespec .fold>.field-name, .typespec .unfold>.field-name {\n\tcursor: help\n}\n.typespec .type-name {\n\tcolor: blue;\n\tcursor: help\n}\n.typespec .type-maker {\n\tcolor: #223497\n}\n.typespec .spliter {\n\tdisplay: inline-block;\n\tcolor: gray;\n\tpadding: 0 0.5em 0 0\n}\n.typespec .type-name~.spliter {\n\tpadding: 0 0.5em\n}\n.typespec .sample pre {\n\tmargin: 0;\n\tcolor: green\n}")