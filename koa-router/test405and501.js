var Koa = require("koa");
var Router = require("./lib/router.js");
var app = new Koa();
var router = new Router();

router.get("/users", function(ctx, next) {
  ctx.body = "xixi";
});
router.put("/users", function() {});

app.use(router.routes());
app.use(router.allowedMethods());

const port = 8000;
app.listen(port, () => {
  console.log(`监听端口     ${port}`);
});
