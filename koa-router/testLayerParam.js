const layer = require("./lib/layer");

const paramTest = new layer("/test/:url/.*", ["post"], [() => {}, () => {}]);
// const secondUrlTest = new layer("/route/:foo/(.*)", ["get", "post"], () => {});

paramTest.param("url", url => {
  console.log("aaa");
});
function injectFunc() {
  console.log("injectFunc");
}
function index(a, b, c) {}
paramTest.param("0", index);

paramTest.param("url", injectFunc);

// secondUrlTest.url("xixi", "sss");
