const koa = require('koa')

const app = new koa();

app.use(async (ctx, next) => {
    console.log(1)
    await b()
    console.log(2)
})

let b = async (ctx) => {
    console.log(3);
    await c()
    console.log(4)
}

let c = async (ctx) => {
    console.log(5)
}


app.listen(3000, () => {
    console.log(`listen in port 3000`)
})