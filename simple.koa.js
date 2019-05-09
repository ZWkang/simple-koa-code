var Emitter  = require('events'),
    http     = require('http'),
    inherits = require('util').inherits,
    compose  = require('./compose.js'),
    inspect  = require('util').inspect,
    debug    = require('debug')('simple-like-koa')


exports = module.exports = Koa

function Koa () {
    this.middleware = []
}

function isObject (arg){
    return Object.prototype.toString.call(arg) === '[object Object]'
}

Koa.prototype = {
    listen(...arg) {
        debug('start listener, args are: ' + inspect(arg))
        const server = http.createServer(this.callback())
        server.listen(...arg)
    },
    use(fn){
        debug('push a fn : '+ (fn.name || fn.constructor))
        this.middleware.push(fn)
    },
    callback() {
        const fn = compose(this.middleware)
        return (req, res) => {
            res.statusCode = 404;
            const ctx = this.createContext(req, res)
            return fn(ctx).then(_ => this.handleResponse(ctx)).catch(_ => this.handleError(ctx, _))
        }
    },
    handleError(ctx, e) {
        debug('handle Error catch error: \n' + e)
        if(e.code){
            ctx.res.statusCode = e.code
        } else {
            ctx.res.statusCode = 500
        }
        if(e.message) {
            ctx.res.end(e.message)
            return
        }
        ctx.res.end(e.message)
    },
    handleResponse(ctx) {
        let { body } = ctx
        debug('now ctx.body is : ' + inspect(ctx.body))
        if(isObject(body)) {
            ctx.res.setHeader('Content-Type', 'application/json')
            ctx.res.end(JSON.stringify(body))
            return 
        }
        if(!!body) {
            ctx.res.body = body
            ctx.res.end(String(body))
        } else {
            ctx.res.end(null)
        }
    },
    createContext(req, res){
        const context = Object.create(null)
        context.req = req
        context.res = res
        context.app = this
        context.ip = req.socket.remoteAddress || '';
        context.state = {};
        context.url = req.url || '/';
        return context
    }
}
inherits(Koa, Emitter)
Koa.__proto__ = Emitter.prototype