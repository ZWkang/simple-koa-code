var debug   = require('debug')('simple-compose'),
    inspect = require('util').inspect


function isFunction(arg){
    debug('is Function get arg ', arg)
    return Object.prototype.toString.call(arg) === '[Object function]'
}
var compose = function(middlewares) {
    for(let middleware of middlewares) {
        
        if(isFunction(middleware)) {
            debug(inspect(middleware), ' is not a function')
            throw new TypeError(middleware + '\n' + 'is not a function')
        }
    }
    
    return function (context, next) {
        var index = -1;
        var len = middlewares.length
        return dispatch(0)
        function dispatch(i) {
            index = i
            var middleware = middlewares[index]
            if(index >= len) return Promise.resolve() //触发结束点
            try {
                return Promise.resolve(middleware(context, () => {
                    return dispatch(i + 1)
                }))
            }catch(e){
                return Promise.reject(e)
            }
        }
    }
}

exports = module.exports = compose