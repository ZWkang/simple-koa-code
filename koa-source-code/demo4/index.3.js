const koa = require('koa')
const app = new koa();

app.use(async (ctx,next) => {
    ctx.handsome = 'you '
    return await next()
})
app.use(async (ctx,next) => {
    ctx.body = {
        handsome: ctx.handsome
    }
})
app.listen(3000, () => {
    console.log(`listening in 3000`)
})