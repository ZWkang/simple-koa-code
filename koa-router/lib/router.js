/**
 * RESTful resource routing middleware for koa.
 *
 * @author Alex Mingoia <talk@alexmingoia.com>
 * @link https://github.com/alexmingoia/koa-router
 */

var debug = require("debug")("koa-router");
var compose = require("koa-compose");
var HttpError = require("http-errors");
var methods = require("methods");
var Layer = require("./layer");

/**
 * @module koa-router
 */

module.exports = Router;

/**
 * Create a new router.
 *
 * @example
 *
 * Basic usage:
 *
 * ```javascript
 * var Koa = require('koa');
 * var Router = require('koa-router');
 *
 * var app = new Koa();
 * var router = new Router();
 *
 * router.get('/', (ctx, next) => {
 *   // ctx.router available
 * });
 *
 * app
 *   .use(router.routes())
 *   .use(router.allowedMethods());
 * ```
 *
 * @alias module:koa-router
 * @param {Object=} opts
 * @param {String=} opts.prefix prefix router paths
 * @constructor
 */
// Router 构造函数
function Router(opts) {
  if (!(this instanceof Router)) {
    return new Router(opts);
  }

  this.opts = opts || {};
  // methods用于对后面allowedMethod做校验的
  this.methods = this.opts.methods || [
    "HEAD",
    "OPTIONS",
    "GET",
    "PUT",
    "PATCH",
    "POST",
    "DELETE"
  ];

  this.params = {};
  this.stack = []; // 存储路由实例
}

/**
 * Create `router.verb()` methods, where *verb* is one of the HTTP verbs such
 * as `router.get()` or `router.post()`.
 *
 * Match URL patterns to callback functions or controller actions using `router.verb()`,
 * where **verb** is one of the HTTP verbs such as `router.get()` or `router.post()`.
 *
 * Additionaly, `router.all()` can be used to match against all methods.
 *
 * ```javascript
 * router
 *   .get('/', (ctx, next) => {
 *     ctx.body = 'Hello World!';
 *   })
 *   .post('/users', (ctx, next) => {
 *     // ...
 *   })
 *   .put('/users/:id', (ctx, next) => {
 *     // ...
 *   })
 *   .del('/users/:id', (ctx, next) => {
 *     // ...
 *   })
 *   .all('/users/:id', (ctx, next) => {
 *     // ...
 *   });
 * ```
 *
 * When a route is matched, its path is available at `ctx._matchedRoute` and if named,
 * the name is available at `ctx._matchedRouteName`
 *
 * Route paths will be translated to regular expressions using
 * [path-to-regexp](https://github.com/pillarjs/path-to-regexp).
 *
 * Query strings will not be considered when matching requests.
 *
 * #### Named routes
 *
 * Routes can optionally have names. This allows generation of URLs and easy
 * renaming of URLs during development.
 *
 * ```javascript
 * router.get('user', '/users/:id', (ctx, next) => {
 *  // ...
 * });
 *
 * router.url('user', 3);
 * // => "/users/3"
 * ```
 *
 * #### Multiple middleware
 *
 * Multiple middleware may be given:
 *
 * ```javascript
 * router.get(
 *   '/users/:id',
 *   (ctx, next) => {
 *     return User.findOne(ctx.params.id).then(function(user) {
 *       ctx.user = user;
 *       next();
 *     });
 *   },
 *   ctx => {
 *     console.log(ctx.user);
 *     // => { id: 17, name: "Alex" }
 *   }
 * );
 * ```
 *
 * ### Nested routers
 *
 * Nesting routers is supported:
 *
 * ```javascript
 * var forums = new Router();
 * var posts = new Router();
 *
 * posts.get('/', (ctx, next) => {...});
 * posts.get('/:pid', (ctx, next) => {...});
 * forums.use('/forums/:fid/posts', posts.routes(), posts.allowedMethods());
 *
 * // responds to "/forums/123/posts" and "/forums/123/posts/123"
 * app.use(forums.routes());
 * ```
 *
 * #### Router prefixes
 *
 * Route paths can be prefixed at the router level:
 *
 * ```javascript
 * var router = new Router({
 *   prefix: '/users'
 * });
 *
 * router.get('/', ...); // responds to "/users"
 * router.get('/:id', ...); // responds to "/users/:id"
 * ```
 *
 * #### URL parameters
 *
 * Named route parameters are captured and added to `ctx.params`.
 *
 * ```javascript
 * router.get('/:category/:title', (ctx, next) => {
 *   console.log(ctx.params);
 *   // => { category: 'programming', title: 'how-to-node' }
 * });
 * ```
 *
 * The [path-to-regexp](https://github.com/pillarjs/path-to-regexp) module is
 * used to convert paths to regular expressions.
 *
 * @name get|put|post|patch|delete|del
 * @memberof module:koa-router.prototype
 * @param {String} path
 * @param {Function=} middleware route middleware(s)
 * @param {Function} callback route callback
 * @returns {Router}
 */

methods.forEach(function(method) {
  // 给原型上附加所有http method 方法
  Router.prototype[method] = function(name, path, middleware) {
    var middleware;
    // 兼容参数
    // 允许path为字符串或者正则表达式
    if (typeof path === "string" || path instanceof RegExp) {
      middleware = Array.prototype.slice.call(arguments, 2);
    } else {
      middleware = Array.prototype.slice.call(arguments, 1);
      path = name;
      name = null;
    }
    // 注册到当前实例上
    // 主要是设置一个通用的install middleware 的方法。(mark. tag: function)
    this.register(path, [method], middleware, {
      name: name
    });
    // 链式调用
    return this;
  };
});

// Alias for `router.delete()` because delete is a reserved word
// router.delete的别名
Router.prototype.del = Router.prototype["delete"];

/**
 * Use given middleware.
 *
 * Middleware run in the order they are defined by `.use()`. They are invoked
 * sequentially, requests start at the first middleware and work their way
 * "down" the middleware stack.
 *
 * @example
 *
 * ```javascript
 * // session middleware will run before authorize
 * router
 *   .use(session())
 *   .use(authorize());
 *
 * // use middleware only with given path
 * router.use('/users', userAuth());
 *
 * // or with an array of paths
 * router.use(['/users', '/admin'], userAuth());
 *
 * app.use(router.routes());
 * ```
 *
 * @param {String=} path
 * @param {Function} middleware
 * @param {Function=} ...
 * @returns {Router}
 */

Router.prototype.use = function() {
  var router = this;
  var middleware = Array.prototype.slice.call(arguments);
  var path;

  // support array of paths
  // 支持数组路由组
  if (Array.isArray(middleware[0]) && typeof middleware[0][0] === "string") {
    middleware[0].forEach(function(p) {
      router.use.apply(router, [p].concat(middleware.slice(1)));
    });

    return this;
  }

  var hasPath = typeof middleware[0] === "string";
  // 上面跟下面这里其实都是在做参数的重组归一
  // 将path 定义成string
  // middleware单独一个数组
  // 下面做处理就可以职责单一了
  if (hasPath) {
    path = middleware.shift();
  }
  // 对传入的中间价数组进行遍历
  middleware.forEach(function(m) {
    // 这里是对框架内部自行处理。
    // routes 会将router属性设为当前router
    // 所以经过routes 生成的中间件都会有这个标示
    // 如果是特殊的路由中间件。则代表已经存在layer了。就不需要再次生成了
    if (m.router) {
      m.router.stack.forEach(function(nestedLayer) {
        // 则 我们可能需要做传入的中间件
        // 1. 对原有路由做前缀绑定
        // 2. 添加当前路由的前缀绑定
        // 3. 将生产的这个layer 压入router的栈中使用
        if (path) nestedLayer.setPrefix(path);
        if (router.opts.prefix) nestedLayer.setPrefix(router.opts.prefix);
        router.stack.push(nestedLayer);
      });
      // 参数原有的params 也要进行覆盖
      if (router.params) {
        Object.keys(router.params).forEach(function(key) {
          m.router.param(key, router.params[key]);
        });
      }
    } else {
      // 如果仅仅是普通中间件 只需要简单的挂载到我们的routers上即可
      router.register(path || "(.*)", [], m, {
        end: false,
        ignoreCaptures: !hasPath
      });
    }
  });

  return this;
};

/**
 * Set the path prefix for a Router instance that was already initialized.
 *
 * @example
 *
 * ```javascript
 * router.prefix('/things/:thing_id')
 * ```
 *
 * @param {String} prefix
 * @returns {Router}
 */

Router.prototype.prefix = function(prefix) {
  prefix = prefix.replace(/\/$/, "");

  this.opts.prefix = prefix;

  this.stack.forEach(function(route) {
    route.setPrefix(prefix);
  });

  return this;
};

/**
 * Returns router middleware which dispatches a route matching the request.
 *
 * @returns {Function}
 */
// routes是实际处理中间件

// router实例  stack 是layer实例数组
// layer实例   stack是middleware 数组
Router.prototype.routes = Router.prototype.middleware = function() {
  var router = this;

  var dispatch = function dispatch(ctx, next) {
    debug("%s %s", ctx.method, ctx.path);
    // 获得路径
    var path = router.opts.routerPath || ctx.routerPath || ctx.path;
    // matched已经是进行过处理了 获得了layer对象承载
    var matched = router.match(path, ctx.method);
    var layerChain, layer, i;
    // 考虑多个router实例的情况
    if (ctx.matched) {
      // 因为matched总是一个数组
      // 这里用apply类似于concat
      ctx.matched.push.apply(ctx.matched, matched.path);
    } else {
      // 匹配的路径
      ctx.matched = matched.path;
    }
    // 当前路由
    ctx.router = router;
    // 如果存在匹配的路由
    if (!matched.route) return next();
    // 方法与路径都匹配的layer
    var matchedLayers = matched.pathAndMethod;
    // 最后一个layer
    var mostSpecificLayer = matchedLayers[matchedLayers.length - 1];
    //
    ctx._matchedRoute = mostSpecificLayer.path;

    // 如果layer存在命名
    if (mostSpecificLayer.name) {
      ctx._matchedRouteName = mostSpecificLayer.name;
    }
    // 匹配的layer进行compose操作

    // update capture params routerName等

    // 例如我们使用了多个路由的话。
    // => ctx.capture, ctx.params, ctx.routerName => layer Stack[s]
    // => ctx.capture, ctx.params, ctx.routerName => next layer Stack[s]
    layerChain = matchedLayers.reduce(function(memo, layer) {
      memo.push(function(ctx, next) {
        ctx.captures = layer.captures(path, ctx.captures);
        ctx.params = layer.params(path, ctx.captures, ctx.params);
        ctx.routerName = layer.name;
        return next();
      });
      return memo.concat(layer.stack);
    }, []);

    return compose(layerChain)(ctx, next);
  };

  dispatch.router = this;

  return dispatch;
};

/**
 * Returns separate middleware for responding to `OPTIONS` requests with
 * an `Allow` header containing the allowed methods, as well as responding
 * with `405 Method Not Allowed` and `501 Not Implemented` as appropriate.
 *
 * @example
 *
 * ```javascript
 * var Koa = require('koa');
 * var Router = require('koa-router');
 *
 * var app = new Koa();
 * var router = new Router();
 *
 * app.use(router.routes());
 * app.use(router.allowedMethods());
 * ```
 *
 * **Example with [Boom](https://github.com/hapijs/boom)**
 *
 * ```javascript
 * var Koa = require('koa');
 * var Router = require('koa-router');
 * var Boom = require('boom');
 *
 * var app = new Koa();
 * var router = new Router();
 *
 * app.use(router.routes());
 * app.use(router.allowedMethods({
 *   throw: true,
 *   notImplemented: () => new Boom.notImplemented(),
 *   methodNotAllowed: () => new Boom.methodNotAllowed()
 * }));
 * ```
 *
 * @param {Object=} options
 * @param {Boolean=} options.throw throw error instead of setting status and header
 * @param {Function=} options.notImplemented throw the returned value in place of the default NotImplemented error
 * @param {Function=} options.methodNotAllowed throw the returned value in place of the default MethodNotAllowed error
 * @returns {Function}
 */

Router.prototype.allowedMethods = function(options) {
  options = options || {};
  var implemented = this.methods;
  // 返回一个中间件用于 app.use注册。
  return function allowedMethods(ctx, next) {
    return next().then(function() {
      var allowed = {};
      // 判断ctx.status 或者状态码为404
      console.log(ctx.matched, ctx.method, implemented);

      if (!ctx.status || ctx.status === 404) {
        // routes方法生成的ctx.matched
        // 就是筛选出来的layer匹配组
        ctx.matched.forEach(function(route) {
          route.methods.forEach(function(method) {
            allowed[method] = method;
          });
        });

        var allowedArr = Object.keys(allowed);
        // 实现了的路由匹配
        if (!~implemented.indexOf(ctx.method)) {
          // 位运算符 ~(-1) === 0 !0 == true
          // options参数 throw如果为true的话则直接扔出错误
          // 这样可以给上层中间价做处理
          // 默认是抛出一个HttpError
          if (options.throw) {
            var notImplementedThrowable;
            if (typeof options.notImplemented === "function") {
              notImplementedThrowable = options.notImplemented(); // set whatever the user returns from their function
            } else {
              notImplementedThrowable = new HttpError.NotImplemented();
            }
            throw notImplementedThrowable;
          } else {
            // 否则跑出501
            // 501=>服务器未实现方法
            ctx.status = 501;
            ctx.set("Allow", allowedArr.join(", "));
          }
          // 如果允许的话
        } else if (allowedArr.length) {
          // 对options请求进行操作。
          // options请求与get请求类似，但是请求没有请求体 只有头。
          // 常用语查询操作
          if (ctx.method === "OPTIONS") {
            ctx.status = 200;
            ctx.body = "";
            ctx.set("Allow", allowedArr.join(", "));
          } else if (!allowed[ctx.method]) {
            // 如果允许方法
            if (options.throw) {
              var notAllowedThrowable;
              if (typeof options.methodNotAllowed === "function") {
                notAllowedThrowable = options.methodNotAllowed(); // set whatever the user returns from their function
              } else {
                notAllowedThrowable = new HttpError.MethodNotAllowed();
              }
              throw notAllowedThrowable;
            } else {
              // 405 方法不被允许
              ctx.status = 405;
              ctx.set("Allow", allowedArr.join(", "));
            }
          }
        }
      }
    });
  };
};

/**
 * Register route with all methods.
 *
 * @param {String} name Optional.
 * @param {String} path
 * @param {Function=} middleware You may also pass multiple middleware.
 * @param {Function} callback
 * @returns {Router}
 * @private
 */
// 所有路由注册
Router.prototype.all = function(name, path, middleware) {
  var middleware;

  if (typeof path === "string") {
    middleware = Array.prototype.slice.call(arguments, 2);
  } else {
    middleware = Array.prototype.slice.call(arguments, 1);
    path = name;
    name = null;
  }

  this.register(path, methods, middleware, {
    name: name
  });

  return this;
};

/**
 * Redirect `source` to `destination` URL with optional 30x status `code`.
 *
 * Both `source` and `destination` can be route names.
 *
 * ```javascript
 * router.redirect('/login', 'sign-in');
 * ```
 *
 * This is equivalent to:
 *
 * ```javascript
 * router.all('/login', ctx => {
 *   ctx.redirect('/sign-in');
 *   ctx.status = 301;
 * });
 * ```
 *
 * @param {String} source URL or route name.
 * @param {String} destination URL or route name.
 * @param {Number=} code HTTP status code (default: 301).
 * @returns {Router}
 */
// 对所有方法针对输入的跳转路径进行ctx.redirect处理
Router.prototype.redirect = function(source, destination, code) {
  // lookup source route by name
  if (source[0] !== "/") {
    source = this.url(source);
  }

  // lookup destination route by name
  if (destination[0] !== "/") {
    destination = this.url(destination);
  }

  return this.all(source, ctx => {
    ctx.redirect(destination);
    ctx.status = code || 301;
  });
};

/**
 * Create and register a route.
 *
 * @param {String} path Path string.
 * @param {Array.<String>} methods Array of HTTP verbs.
 * @param {Function} middleware Multiple middleware also accepted.
 * @returns {Layer}
 * @private
 */
// path 路径
// methods http方法 []字符串数组
// middleware 中间件
// opt参数
// 返回一个layer实例
Router.prototype.register = function(path, methods, middleware, opts) {
  opts = opts || {};

  var router = this;
  var stack = this.stack;

  // support array of paths
  // 支持数组类型的路径
  // 路径逐个遍历 （一层递归）
  if (Array.isArray(path)) {
    // 其实就是手动遍历再逐个注册
    path.forEach(function(p) {
      router.register.call(router, p, methods, middleware, opts);
    });

    return this;
  }

  // create route
  // 创建一个新的路由
  // 其实下面的opts可以视为底层pathtoRegexp需要的参数
  // 这里封装一层数据在进行调用
  var route = new Layer(path, methods, middleware, {
    end: opts.end === false ? opts.end : true, // 需要明确声明为end
    name: opts.name, // tokens的名字
    sensitive: opts.sensitive || this.opts.sensitive || false, // 大小写区分 正则加i
    strict: opts.strict || this.opts.strict || false, // 非捕获分组 加(?:)
    prefix: opts.prefix || this.opts.prefix || "", // 前缀字符
    ignoreCaptures: opts.ignoreCaptures || false // 给layer使用 忽略捕获
  });

  if (this.opts.prefix) {
    route.setPrefix(this.opts.prefix);
  }

  // add parameter middleware
  // 添加参数中间件
  Object.keys(this.params).forEach(function(param) {
    route.param(param, this.params[param]);
  }, this);
  // 当前Router实例stack push单个layer实例
  stack.push(route);

  return route;
};

/**
 * Lookup route with given `name`.
 *
 * @param {String} name
 * @returns {Layer|false}
 */

Router.prototype.route = function(name) {
  // 从命名路由找到该route实例。
  var routes = this.stack;

  for (var len = routes.length, i = 0; i < len; i++) {
    if (routes[i].name && routes[i].name === name) {
      return routes[i];
    }
  }

  return false;
};

/**
 * Generate URL for route. Takes a route name and map of named `params`.
 *
 * @example
 *
 * ```javascript
 * router.get('user', '/users/:id', (ctx, next) => {
 *   // ...
 * });
 *
 * router.url('user', 3);
 * // => "/users/3"
 *
 * router.url('user', { id: 3 });
 * // => "/users/3"
 *
 * router.use((ctx, next) => {
 *   // redirect to named route
 *   ctx.redirect(ctx.router.url('sign-in'));
 * })
 *
 * router.url('user', { id: 3 }, { query: { limit: 1 } });
 * // => "/users/3?limit=1"
 *
 * router.url('user', { id: 3 }, { query: "limit=1" });
 * // => "/users/3?limit=1"
 * ```
 *
 * @param {String} name route name
 * @param {Object} params url parameters
 * @param {Object} [options] options parameter
 * @param {Object|String} [options.query] query options
 * @returns {String|Error}
 */
// 根据路由实例返回实际填充后url参数
Router.prototype.url = function(name, params) {
  var route = this.route(name);

  if (route) {
    // 合并参数
    var args = Array.prototype.slice.call(arguments, 1);
    return route.url.apply(route, args);
  }

  return new Error("No route found for name: " + name);
};

/**
 * Match given `path` and return corresponding routes.
 *
 * @param {String} path
 * @param {String} method
 * @returns {Object.<path, pathAndMethod>} returns layers that matched path and
 * path and method.
 * @private
 */
// path
// method
Router.prototype.match = function(path, method) {
  var layers = this.stack;
  var layer;
  var matched = {
    path: [],
    pathAndMethod: [],
    route: false
  };

  for (var len = layers.length, i = 0; i < len; i++) {
    layer = layers[i];

    debug("test %s %s", layer.path, layer.regexp);

    if (layer.match(path)) {
      //如果路径匹配
      matched.path.push(layer);
      // matched中压入layer

      if (layer.methods.length === 0 || ~layer.methods.indexOf(method)) {
        // 校验方法
        matched.pathAndMethod.push(layer);
        // 路径与方法中都压入layer
        if (layer.methods.length) matched.route = true;
        // 证明没有支持的方法。route为true 后面跳过中间件处理
      }
    }
  }

  return matched;
};

/**
 * Run middleware for named route parameters. Useful for auto-loading or
 * validation.
 * 针对某个param值做中间件处理。
 * 常用于一下自动加载或者校验
 * @example
 *
 * ```javascript
 * router
 *   .param('user', (id, ctx, next) => {
 *     ctx.user = users[id];
 *     if (!ctx.user) return ctx.status = 404;
 *     return next();
 *   })
 *   .get('/users/:user', ctx => {
 *     ctx.body = ctx.user;
 *   })
 *   .get('/users/:user/friends', ctx => {
 *     return ctx.user.getFriends().then(function(friends) {
 *       ctx.body = friends;
 *     });
 *   })
 *   // /users/3 => {"id": 3, "name": "Alex"}
 *   // /users/3/friends => [{"id": 4, "name": "TJ"}]
 * ```
 *
 * @param {String} param
 * @param {Function} middleware
 * @returns {Router}
 */

Router.prototype.param = function(param, middleware) {
  // 加上param校验middlerware 链接layer.prototype.param
  this.params[param] = middleware;
  this.stack.forEach(function(route) {
    route.param(param, middleware);
  });
  return this;
};

/**
 * Generate URL from url pattern and given `params`.
 * 生成url path与params生成url
 * @example
 *
 * ```javascript
 * var url = Router.url('/users/:id', {id: 1});
 * // => "/users/1"
 * ```
 *
 * @param {String} path url pattern
 * @param {Object} params url parameters
 * @returns {String}
 */
// TODO 冗余的。params感觉只是个文档标记量。代码实际参数是拿全部。
// Router.url(path, {xx: id}, {xxx: ss})
// 静态方法 apply掉layer的path然后复用url方法
Router.url = function(path, params) {
  var args = Array.prototype.slice.call(arguments, 1);
  return Layer.prototype.url.apply({ path: path }, args);
};
