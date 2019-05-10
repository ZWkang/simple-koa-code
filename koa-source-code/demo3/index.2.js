var koa = require('koa');
var app = new koa();

app.on('error', function (err, a, b) {
    console.log('app.js onError, error: ', err.message)
    console.log(err)
})

const sleep = () => {
    return new Promise((res, rej) => {
        setTimeout(() => {
            rej('time to die')
        }, 3000)
    })
}
app.use(async (ctx, next) => {
    try{
        await sleep();
    }catch(e){
        console.log(123)
    }
})
app.listen(3000);