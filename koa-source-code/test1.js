var koa = require('./lib/application.js')

var app = new koa();
app.use(async function(ctx,body){
	ctx.body = {
		test:'123'
	}
	console.log(this==ctx.app)
})
app.listen(30000,()=>{

	console.log('123123')
})