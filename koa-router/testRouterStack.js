const Router = require("./lib/router")();

Router.get("/post/:id/:name", () => {});

Router.post("/post", () => {});

console.log(Router);

Router.param("id", () => {});

Router.param("name", (test, name) => {});
Router.param("name", ctx => {
  console.log(test);
});
