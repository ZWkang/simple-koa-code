
'use strict';

/**
 * Module dependencies.
 */

const net = require('net');
const contentType = require('content-type');
const stringify = require('url').format;
const parse = require('parseurl');
const qs = require('querystring');
const typeis = require('type-is');
const fresh = require('fresh');
//检测304之类的
const only = require('only');
//获得对象指定的键值
/**
 * Prototype.
 */

module.exports = {

  /**
   * Return request header.
   *
   * @return {Object}
   * @api public
   */
  //返回原生req对象的headers
  get header() {
    return this.req.headers;
  },

  /**
   * Return request header, alias as request.header
   * 返回request header别名是request.header
   * @return {Object}
   * @api public
   */

  get headers() {
    return this.req.headers;
  },

  /**
   * Get request URL.
   * 获得request的url
   * @return {String}
   * @api public
   */

  get url() {
    return this.req.url;
  },

  /**
   * Set request URL.
   * 设置request的url
   * @api public
   */

  set url(val) {
    this.req.url = val;
  },

  /**
   * Get origin of URL.
   * 获得origin从url里面
   * @return {String}
   * @api public
   */

  get origin() {
    return `${this.protocol}://${this.host}`;
  },

  /**
   * Get full request URL.
   * 获得完全的request URL
   * @return {String}
   * @api public
   */

  get href() {
    // support: `GET http://example.com/foo`
    if (/^https?:\/\//i.test(this.originalUrl)) return this.originalUrl;
    return this.origin + this.originalUrl;
  },

  /**
   * Get request method.
   * 返回请求方法
   * @return {String}
   * @api public
   */

  get method() {
    return this.req.method;
  },

  /**
   * Set request method.
   * 设置request方法
   * @param {String} val
   * @api public
   */

  set method(val) {
    this.req.method = val;
  },

  /**
   * Get request pathname.
   * 获得request的路径地址
   * parse相当于是req.url.parse 但是多次调用一个解析会进行缓存
   * @return {String}
   * @api public
   */

  get path() {
    return parse(this.req).pathname;
  },

  /**
   * Set pathname, retaining the query-string when present.
   * 设置路径名，保留查询字符串。
   * 用于实现输入 methodOverride() 的中间件
   * @param {String} path
   * @api public
   */

  set path(path) {
    const url = parse(this.req);
    if (url.pathname === path) return;

    url.pathname = path;
    url.path = null;

    this.url = stringify(url);
  },

  /**
   * Get parsed query-string.
   * 得到解析后的查询字符串 去除了头部的 ?返回一个对象
   * 不存在查询字符串时，返回空对象。
   * @return {Object}
   * @api public
   */

  get query() {
    const str = this.querystring;
    const c = this._querycache = this._querycache || {};
    return c[str] || (c[str] = qs.parse(str));
  },

  /**
   * Set query-string as an object.
   * 用对象设置查询字符串
   * @param {Object} obj
   * @api public
   */

  set query(obj) {
    this.querystring = qs.stringify(obj);
  },

  /**返回 url 中的查询字符串，包含了头部的 '?'
   * Get query string.
   * 
   * @return {String}
   * @api public
   */

  get querystring() {
    if (!this.req) return '';
    return parse(this.req).query || '';
  },

  /**
   * Set querystring.
   *
   * @param {String} str
   * @api public
   */

  set querystring(str) {
    const url = parse(this.req);
    if (url.search === `?${str}`) return;

    url.search = str;
    url.path = null;

    this.url = stringify(url);
  },

  /**返回 url 中的查询字符串，包含了头部的 '?'
   * Get the search string. Same as the querystring
   * except it includes the leading ?.
   *
   * @return {String}
   * @api public
   */

  get search() {
    if (!this.querystring) return '';
    return `?${this.querystring}`;
  },

  /**
   * Set the search string. Same as
   * response.querystring= but included for ubiquity.
   * 设置查询字符串，包含 '?'
   * @param {String} str
   * @api public
   */

  set search(str) {
    this.querystring = str;
  },

  /**
   * Parse the "Host" header field host
   * and support X-Forwarded-Host when a
   * proxy is enabled.
   * 返回请求主机名 解析Host头部字段 和当app.proxy为true时支持 X-Forwarded-Host
   * @return {String} hostname:port
   * @api public
   */

  get host() {
    const proxy = this.app.proxy;
    let host = proxy && this.get('X-Forwarded-Host');
    host = host || this.get('Host');
    if (!host) return '';
    return host.split(/\s*,\s*/)[0];
  },

  /**
   * Parse the "Host" header field hostname
   * and support X-Forwarded-Host when a
   * proxy is enabled.
   *
   * @return {String} hostname
   * @api public
   */

  get hostname() {
    const host = this.host;
    if (!host) return '';
    return host.split(':')[0];
  },

  /**
   * Check if the request is fresh, aka
   * Last-Modified and/or the ETag
   * still match.
   * 检查请求是否足够新 也就是检查Last-Modified(和/或)ETag仍然匹配
   * 当缓存为最新时，可编写业务逻辑直接返回 304
   * @return {Boolean}
   * @api public
   */

  get fresh() {
    const method = this.method;
    const s = this.ctx.status;

    // GET or HEAD for weak freshness validation only
	// 如果方法不为GET且method不为HEAD就返回false
	// 
    if ('GET' != method && 'HEAD' != method) return false;

    // 2xx or 304 as per rfc2616 14.26
	//检测头部字段状态码
    if ((s >= 200 && s < 300) || 304 == s) {
      return fresh(this.header, this.ctx.response.header);
    }

    return false;
  },

  /**
   * Check if the request is stale, aka
   * "Last-Modified" and / or the "ETag" for the
   * resource has changed.
   * 检查如果请求过时了，又称为"Last-Modified" and / or the "ETag"资源被改变
   * @return {Boolean}
   * @api public
   */

  get stale() {
    return !this.fresh;
  },

  /**
   * Check if the request is idempotent.
   * 检查请求是否是幂等的。
   * @return {Boolean}
   * @api public
   */

  get idempotent() {
    const methods = ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS', 'TRACE'];
    return !!~methods.indexOf(this.method);
  },

  /**
   * Return the request socket.
   * 返回request资源链接socket
   * @return {Connection}
   * @api public
   */

  get socket() {
    return this.req.socket;
  },

  /**
   * Get the charset when present or undefined.
   * 当存在或未定义时获取charset。
   * @return {String}
   * @api public
   */

  get charset() {
    let type = this.get('Content-Type');
    if (!type) return '';

    try {
      type = contentType.parse(type);
    } catch (e) {
      return '';
    }

    return type.parameters.charset || '';
  },

  /**
   * Return parsed Content-Length when present.
   *
   * @return {Number}
   * @api public
   */

  get length() {
    const len = this.get('Content-Length');
    if (len == '') return;
    return ~~len;
  },

  /**
   * Return the protocol string "http" or "https"
   * when requested with TLS. When the proxy setting
   * is enabled the "X-Forwarded-Proto" header
   * field will be trusted. If you're running behind
   * a reverse proxy that supplies https for you this
   * may be enabled.、
   * 如果socket被加密了直接返回https
   * 返回协议字符串http或者https当请求是使用TLS，当proxy代理设置被支持X-Forwarded-Proto头部
   * 字段，如果你运行了一个反向代理为你提供https 这也许可以被支持
   * @return {String}
   * @api public
   */

  get protocol() {
    const proxy = this.app.proxy;
    if (this.socket.encrypted) return 'https';
    if (!proxy) return 'http';
    const proto = this.get('X-Forwarded-Proto') || 'http';
    return proto.split(/\s*,\s*/)[0];
  },

  /**
   * Short-hand for:
   *	速记是否为https
   *    this.protocol == 'https'
   *
   * @return {Boolean}
   * @api public
   */

  get secure() {
    return 'https' == this.protocol;
  },

  /**
   * When `app.proxy` is `true`, parse
   * the "X-Forwarded-For" ip address list.
   *
   * For example if the value were "client, proxy1, proxy2"
   * you would receive the array `["client", "proxy1", "proxy2"]`
   * where "proxy2" is the furthest down-stream.
   * 当app.proxy为true的时候 解析X-Forwarded-For ip地址列表
   * 例如如果那个值为 client, proxy1, proxy2
   * 你会得到一个数组 其中”proxy2“是最远的下游。
   * @return {Array}
   * @api public
   */

  get ips() {
    const proxy = this.app.proxy;
    const val = this.get('X-Forwarded-For');
    return proxy && val
      ? val.split(/\s*,\s*/)
      : [];
  },

  /**
   * Return subdomains as an array.
   *
   * Subdomains are the dot-separated parts of the host before the main domain
   * of the app. By default, the domain of the app is assumed to be the last two
   * parts of the host. This can be changed by setting `app.subdomainOffset`.
   *
   * For example, if the domain is "tobi.ferrets.example.com":
   * If `app.subdomainOffset` is not set, this.subdomains is
   * `["ferrets", "tobi"]`.
   * If `app.subdomainOffset` is 3, this.subdomains is `["tobi"]`.
   * 返回请求对象中的子域名数组。子域名数组会自动由请求域名字符串中的 . 分割开，
   * 在没有设置自定义的 app.subdomainOffset 参数时，默认返回根域名之前的所有子域名数组。
   * 获得子域
   * @return {Array}
   * @api public
   */

  get subdomains() {
    const offset = this.app.subdomainOffset;
    const hostname = this.hostname;
    if (net.isIP(hostname)) return [];
    return hostname
      .split('.')
      .reverse()
      .slice(offset);
  },

  /**
   * Check if the given `type(s)` is acceptable, returning
   * the best match when true, otherwise `false`, in which
   * case you should respond with 406 "Not Acceptable".
   *
   * The `type` value may be a single mime type string
   * such as "application/json", the extension name
   * such as "json" or an array `["json", "html", "text/plain"]`. When a list
   * or array is given the _best_ match, if any is returned.
   * 检测type是否合法
   * 匹配返回你想要的值默认返回全部
   * 当请求头中不包含 Accept 属性时，给定的第一个 type 将会被返回。
   * Examples:
   *
   *     // Accept: text/html
   *     this.accepts('html');
   *     // => "html"
   *
   *     // Accept: text/*, application/json
   *     this.accepts('html');
   *     // => "html"
   *     this.accepts('text/html');
   *     // => "text/html"
   *     this.accepts('json', 'text');
   *     // => "json"
   *     this.accepts('application/json');
   *     // => "application/json"
   *
   *     // Accept: text/*, application/json
   *     this.accepts('image/png');
   *     this.accepts('png');
   *     // => false
   *
   *     // Accept: text/*;q=.5, application/json
   *     this.accepts(['html', 'json']);
   *     this.accepts('html', 'json');
   *     // => "json"
   *
   * @param {String|Array} type(s)...
   * @return {String|Array|false}
   * @api public
   */

  accepts() {
    return this.accept.types.apply(this.accept, arguments);
  },

  /**
   * Return accepted encodings or best fit based on `encodings`.
   *
   * Given `Accept-Encoding: gzip, deflate`
   * an array sorted by quality is returned:
   *	返回一个可接受的编码。优先级如下
   * 也可以指定返回没有就返回false
   *     ['gzip', 'deflate']
   *
   * @param {String|Array} encoding(s)...
   * @return {String|Array}
   * @api public
   */
	//
  acceptsEncodings() {
    return this.accept.encodings.apply(this.accept, arguments);
  },

  /**返回被接收的charset或最适合基于charsets的 
   * Return accepted charsets or best fit based on `charsets`.
   * 判断客户端是否接受给定的编码方式的快捷方法，当有传入参数时，返回最应当返回的一种编码方式。
   * Given `Accept-Charset: utf-8, iso-8859-1;q=0.2, utf-7;q=0.5`
   * an array sorted by quality is returned:
   * 优先级是这个 也可以指定
   *     ['utf-8', 'utf-7', 'iso-8859-1']
   * 返回就是返回一个 没有就返回false
   * 当没有传入参数时，返回客户端的请求数组：
   * @param {String|Array} charset(s)...
   * @return {String|Array}
   * @api public
   */
	
  acceptsCharsets() {
    return this.accept.charsets.apply(this.accept, arguments);
  },
	
  /**返回被接受的语言
   * Return accepted languages or best fit based on `langs`.
   *
   * Given `Accept-Language: en;q=0.8, es, pt`
   * an array sorted by quality is returned:
   *	优先级为下面这个
   *     ['es', 'pt', 'en']
   *	返回就是返回一个 没有就返回false
   * @param {String|Array} lang(s)...
   * @return {Array|String}
   * @api public
   */

  acceptsLanguages() {
    return this.accept.languages.apply(this.accept, arguments);
  },

  /**检查是否包含Content-Type头域  并且包含任何给予mime type的任何内容
   * 如果没有请求体就返回空  如果没有内容类型就返回false 不然就返回匹配的第一个type
   * 判断请求对象中 Content-Type 是否为给定 type 的快捷方法，如果不存在 request.body，将返回 undefined，
   * 如果没有符合的类型，返回 false，除此之外，返回匹配的类型字符串。
   * Check if the incoming request contains the "Content-Type"
   * header field, and it contains any of the give mime `type`s.
   * If there is no request body, `null` is returned.
   * If there is no content type, `false` is returned.
   * Otherwise, it returns the first `type` that matches.
   *
   * Examples:
   *
   *     // With Content-Type: text/html; charset=utf-8
   *     this.is('html'); // => 'html'
   *     this.is('text/html'); // => 'text/html'
   *     this.is('text/*', 'application/json'); // => 'text/html'
   *
   *     // When Content-Type is application/json
   *     this.is('json', 'urlencoded'); // => 'json'
   *     this.is('application/json'); // => 'application/json'
   *     this.is('html', 'application/*'); // => 'application/json'
   *
   *     this.is('html'); // => false
   *
   * @param {String|Array} types...
   * @return {String|false|null}
   * @api public
   */

  is(types) {
    if (!types) return typeis(this.req);
	//req的header为空时会返回null
    if (!Array.isArray(types)) types = [].slice.call(arguments);
    return typeis(this.req, types);
	//判断是否存在type存在的话返回那个type不存在的话返回Boolean
  },

  /** 返回请求mime类型为空时，如“charset”。
   * Return the request mime type void of
   * parameters such as "charset".
   *
   * @return {String}
   * @api public
   */

  get type() {
    const type = this.get('Content-Type');
    if (!type) return '';
    return type.split(';')[0];
  },

  /**
   * Return request header.
   * 返回请求头部
   * Referer是特殊的头部字段
   * The `Referrer` header field is special-cased,
   * both `Referrer` and `Referer` are interchangeable.
   * Referrer与Referer可以互换
   * 然后返回值
   * Examples:
   *
   *     this.get('Content-Type');
   *     // => "text/plain"
   *
   *     this.get('content-type');
   *     // => "text/plain"
   *
   *     this.get('Something');
   *     // => undefined
   *
   * @param {String} field
   * @return {String}
   * @api public
   */

  get(field) {
    const req = this.req;
    switch (field = field.toLowerCase()) {
      case 'referer':
      case 'referrer':
        return req.headers.referrer || req.headers.referer || '';
      default:
        return req.headers[field] || '';
    }
  },

  /**
   * Inspect implementation.
   * 检查实现
   * @return {Object}
   * @api public
   */

  inspect() {
    if (!this.req) return;
    return this.toJSON();
  },

  /**
   * Return JSON representation.
   * 返回JSON表示
   * @return {Object}
   * @api public
   */

  toJSON() {
    return only(this, [
      'method',
      'url',
      'header'
    ]);
  }
};
