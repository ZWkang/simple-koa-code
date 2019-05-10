const koa = require('koa')

const app = new koa();


app.use(async function handlerError(ctx,next){
    try{
        await next();
    }catch(e){
        ctx.status = e.status;
        ctx.body = e.message;
    }
})

const sleep = () => {
    return new Promise((res,rej)=>{
        setTimeout(()=>{
            rej('time to die')
        },3000)
    })
}
app.use(async (ctx,next)=>{

    try {
        await sleep();
    }catch(e){
        ctx.throw(200,e)
    }
})
app.listen(3000)