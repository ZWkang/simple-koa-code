const Router = require("./lib/router");

// const router = new Router();

console.log(Router.url("/name/:id", { id: "123" }));
