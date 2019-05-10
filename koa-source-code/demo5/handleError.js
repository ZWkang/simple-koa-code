const HandlerError = function () {
    return async function (ctx,next){
        try{
            await next();
        }catch(e){
            console.log(e.status,e.message);

            ctx.status = e.status;
            ctx.response.type = 'application/json';
            ctx.body = {
                code: e.status || 500,
                message: e.message || 'error '
            }
        }
    }
}

module.exports = HandlerError