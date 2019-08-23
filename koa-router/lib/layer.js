var debug = require("debug")("koa-router");
var pathToRegExp = require("path-to-regexp");
var uri = require("urijs");

module.exports = Layer;

/**
 * Initialize a new routing Layer with given `method`, `path`, and `middleware`.
 *
 * @param {String|RegExp} path Path string or regular expression.
 * @param {Array} methods Array of HTTP verbs.
 * @param {Array} middleware Layer callback/middleware or series of.
 * @param {Object=} opts
 * @param {String=} opts.name route name
 * @param {String=} opts.sensitive case sensitive (default: false)
 * @param {String=} opts.strict require the trailing slash (default: false)
 * @returns {Layer}
 * @private
 */
/**
 * opts ==> path to regexp options
 */
/**
 * opts
 * name
 * methods
 * paramNames
 * stack
 * path
 * regexp
 *
 */
function Layer(path, methods, middleware, opts) {
  this.opts = opts || {};
  this.name = this.opts.name || null; // 命名路由
  this.methods = []; // 允许方法
  // [{ name: 'bar', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' }]
  this.paramNames = [];
  this.stack = Array.isArray(middleware) ? middleware : [middleware]; // 中间件堆
  // 初始化参数

  // tips : forEach 第二个参数可以传递this
  // forEach push数组以后 可以使用数组[l-1]进行判断末尾元素
  // push方法返回值是该数组push后元素个数

  // 外部method参数传入内部
  methods.forEach(function(method) {
    var l = this.methods.push(method.toUpperCase());
    // 如果是GET请求 支持HEAD请求
    if (this.methods[l - 1] === "GET") {
      this.methods.unshift("HEAD");
    }
  }, this);

  // ensure middleware is a function
  // 保证每一个middleware 为函数
  this.stack.forEach(function(fn) {
    var type = typeof fn;
    if (type !== "function") {
      throw new Error(
        methods.toString() +
          " `" +
          (this.opts.name || path) +
          "`: `middleware` " +
          "must be a function, not `" +
          type +
          "`"
      );
    }
  }, this);
  // 路径
  this.path = path;
  // 利用pathToRegExp 生成路径的正则表达式
  // 与params相关的数组回落入到我们的this.paramNames中
  // this.regexp一个生成用来切割的数组
  this.regexp = pathToRegExp(path, this.paramNames, this.opts);

  debug("defined route %s %s", this.methods, this.opts.prefix + this.path);
}

/**
 * Returns whether request `path` matches route.
 *
 * @param {String} path
 * @returns {Boolean}
 * @private
 */
// 判断是否匹配
Layer.prototype.match = function(path) {
  return this.regexp.test(path);
};

/**
 * Returns map of URL parameters for given `path` and `paramNames`.
 *
 * @param {String} path
 * @param {Array.<String>} captures
 * @param {Object=} existingParams
 * @returns {Object}
 * @private
 */
// 获取路由参数键值对
Layer.prototype.params = function(path, captures, existingParams) {
  var params = existingParams || {};

  for (var len = captures.length, i = 0; i < len; i++) {
    if (this.paramNames[i]) {
      // 获得捕获组相对应
      var c = captures[i]; // 获得参数值
      params[this.paramNames[i].name] = c ? safeDecodeURIComponent(c) : c;
      // 填充键值对
    }
  }
  // 返回参数键值对对象
  return params;
};

/**
 * Returns array of regexp url path captures.
 *
 * @param {String} path
 * @returns {Array.<String>}
 * @private
 */
// 返回参数值
Layer.prototype.captures = function(path) {
  if (this.opts.ignoreCaptures) return []; // 忽略捕获返回空

  // match 返回匹配结果的数组
  // 从正则可以看出生成的正则是一段全匹配。
  /**
   * eg:
   *    var test = []
   *    pathToRegExp('/:id/name/(.*?)', test)
   *
   *    /^\/((?:[^\/]+?))\/name\/((?:.*?))(?:\/(?=$))?$/i
   *
   *    '/xixi/name/ashdjhk'.match(/^\/((?:[^\/]+?))\/name\/((?:.*?))(?:\/(?=$))?$/i)
   *
   *    ["/xixi/name/ashdjhk", "xixi", "ashdjhk"]
   */

  return path.match(this.regexp).slice(1); // [value, value .....]
};

/**
 * Generate URL for route using given `params`.
 *
 * @example
 *
 * ```javascript
 * var route = new Layer(['GET'], '/users/:id', fn);
 *
 * route.url({ id: 123 }); // => "/users/123"
 * ```
 *
 * @param {Object} params url parameters
 * @returns {String}
 * @private
 */
// 用参数构建URL
// url参数键值对 对象
// options.query
// pathToRegExp.compile
// pathToRegExp.parse
Layer.prototype.url = function(params, options) {
  var args = params;
  console.log(this);
  var url = this.path.replace(/\(\.\*\)/g, "");
  var toPath = pathToRegExp.compile(url); // 编译一个path地址获得一个待填充的函数
  var replaced;

  if (typeof params != "object") {
    // params不为对象时
    args = Array.prototype.slice.call(arguments);
    if (typeof args[args.length - 1] == "object") {
      // 强行拿最后一个判断是否为对象 塞进options
      options = args[args.length - 1];
      args = args.slice(0, args.length - 1);
    }
  }

  var tokens = pathToRegExp.parse(url);
  // 将参数切割成数组(带参数的会 { name: 'foo', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' })
  // 直接切割成数组
  /**
   *  var tokens = pathToRegexp.parse('/route/:foo/(.*)')

      console.log(tokens[0])
      //=> "/route"

      console.log(tokens[1])
      //=> { name: 'foo', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' }

      console.log(tokens[2])
      //=> { name: 0, prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '.*' }
   */

  var replace = {};

  if (args instanceof Array) {
    for (var len = tokens.length, i = 0, j = 0; i < len; i++) {
      // 如果入参params是值数组类似[3, 4]
      // 则建立起key value对应的replace 类params对象
      if (tokens[i].name) replace[tokens[i].name] = args[j++];
    }
  } else if (tokens.some(token => token.name)) {
    // 如果tokens部分name存在
    // 证明还是需要parmas替换的。
    // 而且此时的params也是一个对象，
    // 则replace可以直接赋值给params
    replace = params; // replace = params
  } else {
    // 没有需要替换的params。 则此时的params可能是search对象? a= 123
    // 取query使用
    options = params; // options = params
  }

  replaced = toPath(replace); // 默认情况下 replace 是默认传入的键值对 //匹配过后就是完整的url

  if (options && options.query) {
    // 是否存在query
    var replaced = new uri(replaced); //
    replaced.search(options.query); //添加query 路由查询
    return replaced.toString();
  }

  return replaced; // 返回URL串
};

/**
 * Run validations on route named parameters.
 *
 * @example
 *
 * ```javascript
 * router
 *   .param('user', function (id, ctx, next) {
 *     ctx.user = users[id];
 *     if (!user) return ctx.status = 404;
 *     next();
 *   })
 *   .get('/users/:user', function (ctx, next) {
 *     ctx.body = ctx.user;
 *   });
 * ```
 *
 * @param {String} param
 * @param {Function} middleware
 * @returns {Layer}
 * @private
 */
// param 参数值
// fn middleware
Layer.prototype.param = function(param, fn) {
  var stack = this.stack;
  var params = this.paramNames;
  // 获得路径匹配数组
  var middleware = function(ctx, next) {
    return fn.call(this, ctx.params[param], ctx, next);
  };
  // 封装一个中间件。（其实就是代理添加一个参数）
  middleware.param = param;

  middleware.hhhh = fn.length;

  // 中间件添加一个属性param 对应参数名
  var names = params.map(function(p) {
    return String(p.name);
  });
  // 获得参数名字数组

  // 这里的前提是params是一一对应的。
  var x = names.indexOf(param); // 获得index

  if (x > -1) {
    // 如果存在
    // iterate through the stack, to figure out where to place the handler fn
    // 迭代整个stack 取判断 到底应该把这个中间价放在哪里
    stack.some(function(fn, i) {
      // param handlers are always first, so when we find an fn w/o a param property, stop here
      // if the param handler at this part of the stack comes after the one we are adding, stop here
      // 直接判断fn.param是否存在（存在则执行过param方法
      // 如果当前堆栈处理的param函数在我们添加的后面

      // 两个策略
      // 1. 当前fn.param不存在。则直接插入 [a,b] mid => [mid, a, b]
      // 2. [mid, a, b]  mid2 => [mid, mid2, a, b]保证按照params的顺序排列
      // 保证在正常中间件前
      // 保证按照params顺序排列
      if (!fn.param || names.indexOf(fn.param) > x) {
        // inject this param handler right before the current item
        // 在当前注入中间件
        stack.splice(i, 0, middleware);
        return true; // then break the loop
      }
    });
  }

  return this;
};

/**
 * Prefix route path.
 *
 * @param {String} prefix
 * @returns {Layer}
 * @private
 */
// 设置路由前缀
Layer.prototype.setPrefix = function(prefix) {
  // 调用setPrefix相当于将layer的一些构造重置
  if (this.path) {
    this.path = prefix + this.path;
    this.paramNames = [];
    this.regexp = pathToRegExp(this.path, this.paramNames, this.opts);
  }

  return this;
};

/**
 * Safe decodeURIComponent, won't throw any error.
 * If `decodeURIComponent` error happen, just return the original value.
 *
 * @param {String} text
 * @returns {String} URL decode original string.
 * @private
 */
// try catch 包住decodeURIComponent方法，防止抛出错误
// 这种方法相当便捷。。
function safeDecodeURIComponent(text) {
  try {
    return decodeURIComponent(text);
  } catch (e) {
    return text;
  }
}
