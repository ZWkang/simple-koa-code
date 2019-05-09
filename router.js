// const debug = require('debug')('kang-route');
var compose = require('./compose');
var debug = require('debug')('simple-koa-router')
var inspect = require('util').inspect
/**
 * use
 * 1. require('simple-server-router.js')
 * 2. const routers = new Route({
 *      muti: true| false // 是否重复匹配路由
 * })
 * 
 * 3. routers.register(/test/, async (ctx, next) { ctx.body = {name: 'kang'}})
 * 4. app.use(routers.createMiddlerware())
 */
var defaultOptions = {
    muti: false
}
function Route(options) {
    debug('route init get options \n' + inspect(options))
    this.middlerwares = []
    this.options = options || defaultOptions
}

Route.prototype.register = function (regex, middlerware) {
    debug('route register get regex \n' + inspect(regex))
    this.middlerwares.push({
        regex,
        middlerware
    })
}
Route.prototype.createMiddlerware = function () {
    var muti = this.options.muti ? true : false
    return async (ctx, next) => {
        var len = this.middlerwares.length
        var url = ctx.url
        var middlerwares = []
        for(let i = 0; i < len; i++) {
            var middlerware = this.middlerwares[i]
            var isRegexp = middlerware['regex'].exec(url)
            if(isRegexp) {
                ctx.res.statusCode = 200
                debug('set statusCode 200')
                middlerwares.push(middlerware['middlerware'])
                if(i === len-1 || !muti) {
                    return compose(middlerwares)(ctx,next)
                }
            }
        }
        debug('noop work set default 404')
        noop(ctx, next)
        return await next()
    }
}

function noop (ctx, next) {
    ctx.status = 404
    ctx.res.statusMessage = 'Not Found'
}

module.exports = Route