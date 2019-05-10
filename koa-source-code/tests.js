// const compose = require('koa-compose');
// var f1 = async function (ctx,next){
// 	console.log('f1的头部')
// 	next().then(()=>{
// 		console.log('f1的身体')
// 	}).then(()=>{
// 		console.log('f1的尾部')
// 	})
// }
// var f2 = async function (ctx,next){
// 	console.log('f2的头部')
// 	next().then(()=>{
// 		console.log('f2的身体')
// 	}).then((e)=>{
// 		console.log('f2的尾部')
// 	})
// }
// var f3 = async function (ctx,next){
// 	console.log('路由响应')
// }
// var a = [f1,f2,f3]
// compose(a)(this).then(()=>{
// 	console.log('return')
// }).catch((e)=>{
// 	console.log(e)
// })
