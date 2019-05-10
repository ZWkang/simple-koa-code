const koa = require('koa');
const app = new koa();
const handleError = require('./handleError')

app.use(handleError())



app.use(async (ctx,next)=>{
    return ctx.throw(400,`我错了啊`)
})


app.listen(3000);