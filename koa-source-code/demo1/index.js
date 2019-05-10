const koa = require('koa')
const app = new koa();

app.use(async (ctx,next) => {
    ctx.body = {
        data:[
            1,2,3,4,5
        ]
    }
})

app.listen(3000, () => {
    console.log(`listening in 3000`)
})