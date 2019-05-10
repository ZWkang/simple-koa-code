const Koa = require('../');
const app = new Koa();
    app.use((ctx, next) => {
      // set .writable to false
      ctx.socket.writable = false;
      ctx.status = 204;
      // throw if .writeHead or .end is called
      ctx.res.writeHead =
      ctx.res.end = () => {
        throw new Error('response sent');
      };
    });
app.listen(3000);