const koa = require('koa')
const app = new koa();

const sleep = () => {
    return new Promise((res,rej) => {
        setTimeout( () => {
            res(123)
        }, 5000)
    });
}

app.use(async function (ctx,next) {
    const value = await sleep();
    ctx.body = {
        data: value
    };
})

app.listen(3000, () => {
    console.log(`listening in 3000`)
})