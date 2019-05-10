
'use strict';

/**
 * Module dependencies.
 */

const contentDisposition = require('content-disposition');
//创建和解析Content-Disposition头部信息
const ensureErrorHandler = require('error-inject');
//在stream中注入错误信息
const getType = require('mime-types').contentType;
const onFinish = require('on-finished');
//在http请求结束前完成或者有错误的时候执行回调
const isJSON = require('koa-is-json');
/**
function isJSON(body) {
  if (!body) return false;
  if ('string' == typeof body) return false;
  if ('function' == typeof body.pipe) return false;
  if (Buffer.isBuffer(body)) return false;
  return true;
}
*/
const escape = require('escape-html');
//用于HTML字符串转义
const typeis = require('type-is').is;
//typeis.is(mediaType, types)
/**
var mediaType = 'application/json'

typeis.is(mediaType, ['json'])             // 'json'
typeis.is(mediaType, ['html', 'json'])     // 'json'
typeis.is(mediaType, ['application/*'])    // 'application/json'
typeis.is(mediaType, ['application/json']) // 'application/json'

typeis.is(mediaType, ['html']) // false
*/
const statuses = require('statuses');
//被nodejs所支持的状态码

const destroy = require('destroy');
const assert = require('assert');
const extname = require('path').extname;
//返回扩展名
const vary = require('vary');
//header 的 vary字段 后面 追加 val值。
const only = require('only');
//从一个对象里面提取需要的属性

/**
 * Prototype.
 */

module.exports = {

  /**
   * Return the request socket.
   *
   * @return {Connection}
   * @api public
   */

  get socket() {
    return this.ctx.req.socket;
  },

  /**返回响应头部
   * Return response header.
   *
   * @return {Object}
   * @api public
   */

  get header() {
    const { res } = this;
	//解构赋值
	//判断是否小宇<7.7版本然后返回对应方法取值
    return typeof res.getHeaders === 'function'
      ? res.getHeaders()
      : res._headers || {};  // Node < 7.7
	  //
  },

  /**获得头部信息 别名叫做response.header
   * Return response header, alias as response.header
   *
   * @return {Object}
   * @api public
   */

  get headers() {
    return this.header;
  },

  /**获得响应状态码
   * Get response status code.
   *
   * @return {Number}
   * @api public
   */

  get status() {
    return this.res.statusCode;
  },

  /**设置头部状态码
   * Set response status code.
   *
   * @param {Number} code
   * @api public
   */
   //ctx.response.status =xxx
  set status(code) {
    assert('number' == typeof code, 'status code must be a number');
    assert(statuses[code], `invalid status code: ${code}`);
    assert(!this.res.headersSent, 'headers have already been sent');
    this._explicitStatus = true;//一个标记如果这个为false后面会自动设置状态码
    this.res.statusCode = code;//设置res.statusCode
    this.res.statusMessage = statuses[code];//设置status message statuses是一些状态码与常见回应的字符串例如404 :not found这种
    if (this.body && statuses.empty[code]) this.body = null;//如果状态码不在http状态码内 body=null不应答
  },

  /**
   * Get response status message
   *
   * @return {String}
   * @api public
   */
	//获得statusMessage
  get message() {
    return this.res.statusMessage || statuses[this.status];
  },

  /**
   * Set response status message
   *
   * @param {String} msg
   * @api public
   */
	//设置statusMessage 用的只是原生的Res对象罢了
  set message(msg) {
    this.res.statusMessage = msg;
  },

  /** 得到响应的body
   * Get response body.
   *
   * @return {Mixed}
   * @api public
   */

  get body() {
    return this._body;
  },

  /** 设置响应体
   * Set response body.
   *
   * @param {String|Buffer|Object|Stream} val
   * @api public
   */

  set body(val) {
    
    const original = this._body;
    this._body = val;
	
	//如果已经发送
    if (this.res.headersSent) return;

    // no content
	//如果没有要设置的内容返回204
    if (null == val) {
      if (!statuses.empty[this.status]) this.status = 204;
      this.remove('Content-Type');
      this.remove('Content-Length');
      this.remove('Transfer-Encoding');
      return;
    }

    // set the status
	// _explicitStatus标识符
    if (!this._explicitStatus) this.status = 200;
	// 仅在尚未设置的情况下才设置内容类型
    // set the content-type only if not yet set
    const setType = !this.header['content-type'];
	//传入为字符串
    // string
    if ('string' == typeof val) {
      if (setType) this.type = /^\s*</.test(val) ? 'html' : 'text';
      this.length = Buffer.byteLength(val);
      return;
    }

    // buffer
	// 如果是buffer
    if (Buffer.isBuffer(val)) {
      if (setType) this.type = 'bin';
      this.length = val.length;
      return;
    }

    // stream
	//如果是stream
    if ('function' == typeof val.pipe) {
      onFinish(this.res, destroy.bind(null, val));
      ensureErrorHandler(val, err => this.ctx.onerror(err));

      // overwriting
	  // 覆盖
      if (null != original && original != val) this.remove('Content-Length');

      if (setType) this.type = 'bin';
      return;
    }

    // json
    this.remove('Content-Length');
    this.type = 'json';
	//默认是json
	console.log(this.toJSON(),this)
  },

  /** 设置Content-Type
   * Set Content-Length field to `n`.
   *
   * @param {Number} n
   * @api public
   */

  set length(n) {
    this.set('Content-Length', n);
  },

  /** 返回解析响应的Content-Length当存在时
   * Return parsed response Content-Length when present.
   *
   * @return {Number}
   * @api public
   */

  get length() {
    const len = this.header['content-length'];
    const body = this.body;
	//如果content-type不存在就用body判断这个length值
    if (null == len) {
      if (!body) return;
      if ('string' == typeof body) return Buffer.byteLength(body);
      if (Buffer.isBuffer(body)) return body.length;
      if (isJSON(body)) return Buffer.byteLength(JSON.stringify(body));
      return;
    }
	//保证是数字
    return ~~len;
  },

  /** 检查是否被写入了socket内
   * Check if a header has been written to the socket.
   *
   * @return {Boolean}
   * @api public
   */

  get headerSent() {
    return this.res.headersSent;
	//返回一个布尔值（只读）。 如果响应头已被发送则为 true，否则为 false。
  },

  /**
   * Vary on `field`.
   * 给vary添加field  用于代理服务器的缓存控制
   * 服务器为 Vary 设置一组 header，告诉代理服务器该如何使用缓存。
   * 在后续的请求中，代理服务器只对请求中包含相同的 header 返回缓存。
   * http://mark.koli.ch/understanding-the-http-vary-header-and-caching-proxies-squid-etc
   * @param {String} field
   * @api public
   */

  vary(field) {
    (this.res, field);
  },

  /** 执行302重定向到url
   * Perform a 302 redirect to `url`.
   * 字符串back是特殊的，以提供Referer支持 
   * Referrer不存在时使用地址或者/
   * The string "back" is special-cased
   * to provide Referrer support, when Referrer
   * is not present `alt` or "/" is used.
   *
   * Examples:
   *
   *    this.redirect('back');
   *    this.redirect('back', '/index.html');
   *    this.redirect('/login');
   *    this.redirect('http://google.com');
   *
   * @param {String} url
   * @param {String} [alt]
   * @api public
   */

  redirect(url, alt) {
    // location
    if ('back' == url) url = this.ctx.get('Referrer') || alt || '/';
	//设置跳转Location地址
    this.set('Location', url);

    // status
	//如果不在redirect状态码内就设定为302
    if (!statuses.redirect[this.status]) this.status = 302;

    // html
	// accept type如果为html
    if (this.ctx.accepts('html')) {
      url = escape(url);
      this.type = 'text/html; charset=utf-8';
	  // 设置一个跳转
      this.body = `Redirecting to <a href="${url}">${url}</a>.`;
      return;
    }

    // text
	// 不然的话文本就直接描述跳转
    this.type = 'text/plain; charset=utf-8';
    this.body = `Redirecting to ${url}.`;
  },

  /**将Content-Disposition标题设置为可选的`filename`为“attachment”。
   * Set Content-Disposition header to "attachment" with optional `filename`.
   *
   * @param {String} filename
   * @api public
   */

  attachment(filename) {
    if (filename) this.type = extname(filename);
    this.set('Content-Disposition', contentDisposition(filename));
  },

  /** 通过mime.lookup将type设置content-type当没有charset时
   * Set Content-Type response header with `type` through `mime.lookup()`
   * when it does not contain a charset.
   * 被允许的时候为添加，不被允许为删除
   * Examples:
   *
   *     this.type = '.html';
   *     this.type = 'html';
   *     this.type = 'json';
   *     this.type = 'application/json';
   *     this.type = 'png';
   *
   * @param {String} type
   * @api public
   */

  set type(type) {
    type = getType(type) || false;
    if (type) {
      this.set('Content-Type', type);
    } else {
      this.remove('Content-Type');
    }
  },

  /** 使用字符串或日期设置Last-Modified日期。
   * Set the Last-Modified date using a string or a Date.
   *
   *     this.response.lastModified = new Date();
   *     this.response.lastModified = '2013-09-13';
   *
   * @param {String|Date} type
   * @api public
   */

  set lastModified(val) {
    if ('string' == typeof val) val = new Date(val);
    this.set('Last-Modified', val.toUTCString());
  },

  /** 以“日期”形式获取上次修改日期（如果存在）。
   * Get the Last-Modified date in Date form, if it exists.
   *
   * @return {Date}
   * @api public
   */

  get lastModified() {
    const date = this.get('last-modified');
    if (date) return new Date(date);
  },

  /** 设置响应的ETag
   * 如果需要 这将使引号规范化
   * Set the ETag of a response.
   * This will normalize the quotes if necessary.
   *
   *     this.response.etag = 'md5hashsum';
   *     this.response.etag = '"md5hashsum"';
   *     this.response.etag = 'W/"123456789"';
   *
   * @param {String} etag
   * @api public
   */

  set etag(val) {
    if (!/^(W\/)?"/.test(val)) val = `"${val}"`;
    this.set('ETag', val);
  },

  /**
   * Get the ETag of a response.
   *从response获得ETag
   * @return {String}
   * @api public
   */

  get etag() {
    return this.get('ETag');
  },

  /**
   * Return the response mime type void of
   * parameters such as "charset".
   *返回响应mime空的参数，如“charset”
   * @return {String}
   * @api public
   */

  get type() {
    const type = this.get('Content-Type');
    if (!type) return '';
    return type.split(';')[0];
  },

  /**检查响应是不是被允许的
   * Check whether the response is one of the listed types.
   * Pretty much the same as `this.request.is()`.
   * 与this.request.is()相同
   * @param {String|Array} types...
   * @return {String|false}
   * @api public
   */

  is(types) {
    const type = this.type;
    if (!types) return type || false;
    if (!Array.isArray(types)) types = [].slice.call(arguments);
	//检查是否被允许 允许就返回对应的值
    return typeis(type, types);
  },

  /**返回响应头。
   * Return response header.
   *
   * Examples:
   *
   *     this.get('Content-Type');
   *     // => "text/plain"
   *
   *     this.get('content-type');
   *     // => "text/plain"
   *得到某个头部信息
   *这边都转换小写了。
   * @param {String} field
   * @return {String}
   * @api public
   */

  get(field) {
    return this.header[field.toLowerCase()] || '';
  },

  /** 设置header字段或者值 or 传递头部字段的对象。
   * Set header `field` to `val`, or pass
   * an object of header fields.
   *
   * Examples:
   *
   *    this.set('Foo', ['bar', 'baz']);
   *    this.set('Accept', 'application/json');
   *    this.set({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
   *
   * @param {String|Object|Array} field
   * @param {String} val
   * @api public
   */

  set(field, val) {
    if (2 == arguments.length) {
      if (Array.isArray(val)) val = val.map(String);
      else val = String(val);
      this.res.setHeader(field, val);
    } else {
      for (const key in field) {
        this.set(key, field[key]);
      }
    }
  },

  /**附加额外的字段值
   * Append additional header `field` with value `val`.
   *
   * Examples:
   *
   * ```
   * this.append('Link', ['<http://localhost/>', '<http://localhost:3000/>']);
   * this.append('Set-Cookie', 'foo=bar; Path=/; HttpOnly');
   * this.append('Warning', '199 Miscellaneous warning');
   * ```
   *
   * @param {String} field
   * @param {String|Array} val
   * @api public
   */

  append(field, val) {
    const prev = this.get(field);

    if (prev) {
		//是数组的话进行拼接 不是的话转化成数组调用拼接
      val = Array.isArray(prev)
        ? prev.concat(val)
        : [prev].concat(val);
    }

    return this.set(field, val);
  },

  /** 删除头部字段
   * Remove header `field`.
   *
   * @param {String} name
   * @api public
   */

  remove(field) {
    this.res.removeHeader(field);
  },

  /** 检查请求是否可写
   * Checks if the request is writable.
   * Tests for the existence of the socket
   * as node sometimes does not set it.
   *	测试socket的存在 作为节点有时不设置它
   * @return {Boolean}
   * @api private
   */

  get writable() {
    // can't write any more after response finished
    if (this.res.finished) return false;

    const socket = this.res.socket;
    // There are already pending outgoing res, but still writable
    // https://github.com/nodejs/node/blob/v4.4.7/lib/_http_server.js#L486
    if (!socket) return true;
    return socket.writable;
  },

  /**
   * Inspect implementation.
   * 检查实现
   * @return {Object}
   * @api public
   */

  inspect() {
	//如果为空什么都不敢
    if (!this.res) return;
	//如果存在 
    const o = this.toJSON();
    o.body = this.body;
    return o;
  },

  /**
   * Return JSON representation.
   * 返回json表示
   * @return {Object}
   * @api public
   */

  toJSON() {
    return only(this, [
      'status',
      'message',
      'header'
    ]);
  },

  /**
   * Flush any set headers, and begin the body
   * 刷新任何设置的标题，并开始正文
   */
  flushHeaders() {
    this.res.flushHeaders();
  }
};
