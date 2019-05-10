
'use strict';

/**
 * Module dependencies.
 */

const isGeneratorFunction = require('is-generator-function');
//判断是不是generator function
const debug = require('debug')('koa:application');
//设置debug 的`namespace`
const onFinished = require('on-finished');
//执行回调当http request关闭结束或者有错误的时候
const response = require('./response');
//引入response
const compose = require('koa-compose');
//重头戏 koa-compose
const isJSON = require('koa-is-json');
//判断body是否应该为JSON //string 假值或者为stream或者buffer的时候返回false
const context = require('./context');
const request = require('./request');
const statuses = require('statuses');
//下面只用了empty方法
//statuses是一个对象 empty属性
//status.empty = {
//  204: true,
//  205: true,
//  304: true
//}
const Cookies = require('cookies');
//获取设置http(s)cookie的模块
const accepts = require('accepts');
//http accepts
//Accept 请求头用来告知客户端可以处理的内容类型，这种内容类型用MIME类型来表示
const Emitter = require('events');
//事件机制
const assert = require('assert');
//断言库
const Stream = require('stream');
// stream模块
const http = require('http');
//引入http模块
const only = require('only');
//返回对象的指定键值
const convert = require('koa-convert');
//将基于koa生成器的中间件转换为基于promise的中间件
const deprecate = require('depd')('koa');
//给出一些信息(标志已经弃用)

/**
 * Expose `Application` class.
 * Inherits from `Emitter.prototype`.
 */

 //Application是继承自 Event 模块的事件监听器，并且 Koa2 已经使用了 ES6 的 class 语法。
module.exports = class Application extends Emitter {
  /**
   * Initialize a new `Application`.
   *
   * @api public
   */
	//构造函数
  constructor() {
    super();
	
    this.proxy = false;
    //记录中间件的数组
	this.middleware = [];
	//子域的偏移量
    this.subdomainOffset = 2;
	//环境变量
    this.env = process.env.NODE_ENV || 'development';
	
    this.context = Object.create(context);
    this.request = Object.create(request);
    this.response = Object.create(response);
  }

  /**
   * Shorthand for:
   *
   *    http.createServer(app.callback()).listen(...)
   *
   * @param {Mixed} ...
   * @return {Server}
   * @api public
   */
	//listen方法
  listen() {
    debug('listen');
	//实际上调用http createServer方法
	//可是这个callback
    const server = http.createServer(this.callback());
    return server.listen.apply(server, arguments);
  }

  /**
   * Return JSON representation.
   * We only bother showing settings.
   *
   * @return {Object}
   * @api public
   */
	//返回json表示
  toJSON() {
    return only(this, [
      'subdomainOffset',
      'proxy',
      'env'
    ]);
  }

  /**
   * Inspect implementation.
   *
   * @return {Object}
   * @api public
   */
	//用于检查实现
  inspect() {
    return this.toJSON();
  }

  /**
   * Use the given middleware `fn`.
   *
   * Old-style middleware will be converted.
   *
   * @param {Function} fn
   * @return {Application} self
   * @api public
   */
	//use 传入一个fn
	//如果不是函数  报错
  use(fn) {
    if (typeof fn !== 'function') throw new TypeError('middleware must be a function!');
    //判断是否为函数
	
	if (isGeneratorFunction(fn)) {
	//如果是Generator函数
      deprecate('Support for generators will be removed in v3. ' +
                'See the documentation for examples of how to convert old middleware ' +
                'https://github.com/koajs/koa/blob/master/docs/migration.md');
		//输出将要被移除的信息
	  fn = convert(fn);
	  //将generator函数进行转换
    }
    debug('use %s', fn._name || fn.name || '-');
	//输出信息
    this.middleware.push(fn);
	//压入中间件数组内
    return this;
	//链式
  }

  /**
   * Return a request handler callback
   * for node's native http server.
   *
   * @return {Function}
   * @api public
   */
//返回一个用于createserver请求的回调处理器
  callback() {
	//compose的作用是传入一个middleware数组然后组成一个链式调用的Promise对象传出
	/*
	Promise.resolve(fn(context,function next(){
		Promise.resolve(fn(context,function next(){
			Promise.resolve()
		}))
	}))
	*/
	console.log(this.onerror.toString())
    const fn = compose(this.middleware);
	//listeners方法接受一个事件名称作为参数，返回该事件所有回调函数组成的数组。
    if (!this.listeners('error').length) this.on('error', this.onerror);
	//如果监听函数没有，那么。使用默认的onerror函数

	//callback返回的函数
	//接受request跟res  
	//实际上
    const handleRequest = (req, res) => {
      res.statusCode = 404;
	  //
      const ctx = this.createContext(req, res);
	  // 如果使用过koa那么可以知道这一步多重要
	  // 创建ctx对象
      const onerror = err => ctx.onerror(err);
      const handleResponse = () => respond(ctx);
	  //这行代码其实很简单，就是监听response，如果response有错误，会执行ctx.onerror中的逻辑，设置response类型，状态码和错误信息等。
      onFinished(res, onerror);
      return fn(ctx).then(handleResponse).catch(onerror);
    };

    return handleRequest;
  }

  /**
   * Initialize a new context.
   *
   * @api private
   */
//koa中的this其实就是app.createContext方法返回的完整版context
  createContext(req, res) {
	//继承
	//context ---> this.context
	//			->request  ->this.request
	//request 
	//			->response ->this.response
    const context = Object.create(this.context);
    const request = context.request = Object.create(this.request);
    const response = context.response = Object.create(this.response);
    //往context，request，response身上挂载属性
	//ctx.app->request.app->response.app->this
	context.app = request.app = response.app = this;
	//context.req -> request.req -> response.req -> req(原生request);
    //context.res -> request.res -> response.res -> res(原生response);
    context.req = request.req = response.req = req;
    context.res = request.res = response.res = res;
	//request.ctx->response.ctx->context
    request.ctx = response.ctx = context;
	//
    request.response = response;
    response.request = request;
	//请求url
	//http://localhost:30000/test/?key=1 --->/test/?key=1
    context.originalUrl = request.originalUrl = req.url;

    context.cookies = new Cookies(req, res, {
      keys: this.keys,
      secure: request.secure
    });
	
	//console.log('test',context.request.response)
    request.ip = request.ips[0] || req.socket.remoteAddress || '';
    
	//一个accepts object
	//包装请求头
	context.accept = request.accept = accepts(req);
	
    
	context.state = {};
    
	return context;
	//返回包装处理后的context/ctx
  }

  /**
   * Default error handler.
   *
   * @param {Error} err
   * @api private
   */
	//默认的错误控制
  onerror(err) {
    assert(err instanceof Error, `non-error thrown: ${err}`);
	//如果状态码为404
    if (404 == err.status || err.expose) return;
    if (this.silent) return;

    const msg = err.stack || err.toString();
    console.error();
    console.error(msg.replace(/^/gm, '  '));
    console.error();
  }
};

/**
 * Response helper.
 */

function respond(ctx) {
  // allow bypassing koa
  if (false === ctx.respond) return;

  const res = ctx.res;
  if (!ctx.writable) return;

  let body = ctx.body;
  const code = ctx.status;

  // ignore body
  if (statuses.empty[code]) {
    // strip headers
    ctx.body = null;
    return res.end();
  }

  if ('HEAD' == ctx.method) {
    if (!res.headersSent && isJSON(body)) {
      ctx.length = Buffer.byteLength(JSON.stringify(body));
    }
    return res.end();
  }

  // status body
  if (null == body) {
    body = ctx.message || String(code);
    if (!res.headersSent) {
      ctx.type = 'text';
      ctx.length = Buffer.byteLength(body);
    }
    return res.end(body);
  }

  // responses
  if (Buffer.isBuffer(body)) return res.end(body);
  if ('string' == typeof body) return res.end(body);
  if (body instanceof Stream) return body.pipe(res);

  // body: json
  body = JSON.stringify(body);
  if (!res.headersSent) {
    ctx.length = Buffer.byteLength(body);
  }
  res.end(body);
}
