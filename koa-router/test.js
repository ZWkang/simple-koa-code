const Koa = require("koa");
const router = require("./lib/router")();
const app = new Koa();
const compose = require("koa-compose");
const port = 8888;

router.get(
  "/name",
  compose([
    async function(ctx, next) {
      ctx.body += "first ";
      await next();
    },
    async function(ctx, next) {
      ctx.body += "second";
      await next();
    }
  ])
);
router.get("/:user", async (ctx, next) => {
  ctx.body += "\nuser is here";
  await next();
});
// router.get('/:id', async (ctx, next) => {
//   ctx.body = 'test'
//   await next()
// })
// router.get('/:id/asd/(.*)', async (ctx, next) => {
//   ctx.body = ctx.path
//   await next()
// })

app.use(router.routes());

app.use(router.allowedMethods());
console.log(router.stack);

app.onerror = function(e) {
  console.log(e.messgae);
};

app.listen(port, () => {
  console.log(`监听端口     ${port}`);
});

// const layer = require('./lib/layer')

// var route = new layer('/users/:id/name/(.*)', ['GET'], () => {});

// console.log(route.url({ id: 123 })); // => "/users/123"
